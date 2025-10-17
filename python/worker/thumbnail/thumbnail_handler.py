"""
Thumbnail Handler - Manages thumbnail generation and database records

Coordinates between the thumbnail generator and database models to:
- Generate small and large thumbnails
- Create Thumbnail database records
- Track failed generations in FailedThumbnail table
- Handle retries with exponential backoff
"""
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional

from shared.db.models import Clip, Thumbnail, FailedThumbnail
from shared.storage import get_storage_backend
from worker.thumbnail.thumbnail_generator import (
    ThumbnailGenerator,
    THUMBNAIL_SMALL_WIDTH,
    THUMBNAIL_SMALL_HEIGHT,
    THUMBNAIL_LARGE_WIDTH,
    THUMBNAIL_LARGE_HEIGHT,
)

logger = logging.getLogger(__name__)


class ThumbnailHandler:
    """Handles thumbnail generation and database persistence"""
    
    def __init__(self):
        """Initialize the thumbnail handler"""
        self.generator = ThumbnailGenerator()
        self.storage = get_storage_backend()
    
    async def close(self):
        """Close the thumbnail generator and cleanup resources"""
        await self.generator.close()
    
    async def process_clip(self, clip: Clip) -> bool:
        """
        Process a clip to generate thumbnails and create database records
        
        Args:
            clip: Clip model instance
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Processing thumbnails for clip: {clip.id}")
        
        try:
            # Update status to processing
            await clip.update_from_dict({"thumbnail_status": "processing"}).save()
            
            # Generate thumbnails and extract video metadata
            small_path, large_path, video_metadata = await self.generator.generate_for_clip(clip)
            
            # Get file sizes for database records
            small_full_path = os.path.join(
                self.storage.base_path if hasattr(self.storage, 'base_path') else './storage',
                small_path
            )
            large_full_path = os.path.join(
                self.storage.base_path if hasattr(self.storage, 'base_path') else './storage',
                large_path
            )
            
            small_size = os.path.getsize(small_full_path) if os.path.exists(small_full_path) else 0
            large_size = os.path.getsize(large_full_path) if os.path.exists(large_full_path) else 0
            
            # Create or update small thumbnail record
            await Thumbnail.update_or_create(
                clip=clip,
                size_type="small",
                defaults={
                    "id": str(uuid.uuid4()),
                    "storage_path": small_path,
                    "width": THUMBNAIL_SMALL_WIDTH,
                    "height": THUMBNAIL_SMALL_HEIGHT,
                    "file_size": small_size,
                    "mime_type": "image/webp",
                }
            )
            
            # Create or update large thumbnail record
            await Thumbnail.update_or_create(
                clip=clip,
                size_type="large",
                defaults={
                    "id": str(uuid.uuid4()),
                    "storage_path": large_path,
                    "width": THUMBNAIL_LARGE_WIDTH,
                    "height": THUMBNAIL_LARGE_HEIGHT,
                    "file_size": large_size,
                    "mime_type": "image/webp",
                }
            )
            
            # Update clip with video metadata and mark thumbnails as completed
            update_data = {"thumbnail_status": "completed"}
            
            # Update MIME type if we got better info from ffmpeg probe
            if video_metadata.get('mime_type'):
                update_data['mime_type'] = video_metadata['mime_type']
            
            # Update duration if available and not already set
            if video_metadata.get('duration') and not clip.duration:
                update_data['duration'] = video_metadata['duration']
            
            # Update resolution if available and not already set
            if video_metadata.get('resolution') and not clip.resolution:
                update_data['resolution'] = video_metadata['resolution']
            
            await clip.update_from_dict(update_data).save()
            
            logger.info(f"Updated clip metadata: mime_type={update_data.get('mime_type')}, "
                       f"duration={update_data.get('duration')}, resolution={update_data.get('resolution')}")
            
            logger.info(f"Successfully processed thumbnails for clip {clip.id}")
            logger.info(f"  Small: {small_path} ({small_size:,} bytes)")
            logger.info(f"  Large: {large_path} ({large_size:,} bytes)")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process thumbnails for clip {clip.id}: {e}", exc_info=True)
            
            # Update clip status to failed
            await clip.update_from_dict({"thumbnail_status": "failed"}).save()
            
            # Record failure for retry
            await self._record_failure(clip, str(e))
            
            return False
    
    async def _record_failure(self, clip: Clip, error_message: str):
        """
        Record a failed thumbnail generation attempt
        
        Args:
            clip: Clip that failed
            error_message: Error message
        """
        # Check if there's an existing failed record
        existing = await FailedThumbnail.filter(clip=clip).first()
        
        if existing:
            # Increment retry count and update
            retry_count = existing.retry_count + 1
            
            # Exponential backoff: 5min, 15min, 1hr, 4hr, 12hr, 24hr
            backoff_minutes = [5, 15, 60, 240, 720, 1440]
            delay_minutes = backoff_minutes[min(retry_count - 1, len(backoff_minutes) - 1)]
            
            await existing.update_from_dict({
                "error_message": error_message,
                "retry_count": retry_count,
                "last_attempted_at": datetime.now(timezone.utc),
                "next_retry_at": datetime.now(timezone.utc) + timedelta(minutes=delay_minutes),
            }).save()
            
            logger.info(f"Updated failed thumbnail record for clip {clip.id}: retry #{retry_count}, next retry in {delay_minutes} minutes")
        else:
            # Create new failed record
            await FailedThumbnail.create(
                id=str(uuid.uuid4()),
                clip=clip,
                error_message=error_message,
                retry_count=1,
                last_attempted_at=datetime.now(timezone.utc),
                next_retry_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            )
            
            logger.info(f"Created failed thumbnail record for clip {clip.id}: next retry in 5 minutes")
    
    async def retry_failed_thumbnails(self) -> int:
        """
        Retry failed thumbnail generations that are due for retry
        
        Returns:
            Number of thumbnails successfully retried
        """
        now = datetime.now(timezone.utc)
        
        # Get failed thumbnails that are due for retry
        failed = await FailedThumbnail.filter(
            next_retry_at__lte=now
        ).prefetch_related('clip').limit(10)  # Process 10 at a time
        
        if not failed:
            logger.debug("No failed thumbnails due for retry")
            return 0
        
        logger.info(f"Found {len(failed)} failed thumbnails due for retry")
        
        success_count = 0
        for failed_thumbnail in failed:
            clip = failed_thumbnail.clip
            
            logger.info(f"Retrying thumbnail generation for clip {clip.id} (attempt #{failed_thumbnail.retry_count + 1})")
            
            success = await self.process_clip(clip)
            
            if success:
                # Delete the failed record on success
                await failed_thumbnail.delete()
                success_count += 1
                logger.info(f"Successfully retried clip {clip.id}")
            else:
                # _record_failure will update the retry schedule
                logger.warning(f"Retry failed for clip {clip.id}")
        
        logger.info(f"Retry batch complete: {success_count}/{len(failed)} successful")
        return success_count
