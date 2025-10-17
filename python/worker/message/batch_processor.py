"""
Batch message processor for efficient processing of multiple messages
"""
import logging
from typing import List
import discord
from shared.settings_resolver import get_channel_settings
from worker.message.batch_context import BatchContext
from worker.message.batch_operations import BatchDatabaseOperations
from worker.thumbnail.thumbnail_handler import ThumbnailHandler
from worker.message.utils import compute_settings_hash
from worker.message.validators import should_process_message, filter_video_attachments
from worker.message.clip_metadata import build_clip_id_map, get_all_clip_ids, extract_clip_info
from shared.db.models import Clip

logger = logging.getLogger(__name__)


class BatchMessageProcessor:
    """
    Processes multiple messages in a batch with optimized database calls.
    
    Key optimizations:
    - Settings fetched once per batch
    - Existing clips loaded in bulk
    - Users/messages/clips upserted in batches
    - Thumbnail existence checked in bulk
    """
    
    def __init__(self):
        self.db_ops = BatchDatabaseOperations()
        self.thumbnail_handler = ThumbnailHandler()
    
    async def process_messages_batch(
        self,
        messages: List[discord.Message],
        channel_id: str,
        guild_id: str
    ) -> tuple[int, int]:
        """
        Process a batch of messages efficiently.
        
        Args:
            messages: List of Discord messages
            channel_id: Channel snowflake
            guild_id: Guild snowflake
            
        Returns:
            Tuple of (clips_found, thumbnails_generated)
        """
        if not messages:
            return 0, 0
        
        logger.info(f"Starting batch processing of {len(messages)} messages")
        
        # Fetch settings and initialize context
        settings = await get_channel_settings(guild_id, channel_id)
        context = self._initialize_context(guild_id, channel_id, settings)
        
        # Pre-filter and extract clip metadata
        clip_map = build_clip_id_map(messages, channel_id, settings)
        clip_ids = get_all_clip_ids(clip_map)
        
        # Load existing clips in bulk
        context.existing_clips = await self.db_ops.load_existing_clips(
            channel_id=channel_id,
            clip_ids=clip_ids
        )
        
        logger.debug(
            f"Found {len(context.existing_clips)} existing clips from "
            f"{len(clip_ids)} potential clips"
        )
        
        # Process messages and collect data
        await self._collect_message_data(messages, clip_map, context)
        
        # Bulk upsert all collected data
        await self._bulk_upsert_data(context)
        
        # Generate thumbnails
        thumbnails_generated = await self._generate_thumbnails(context)
        
        self._log_summary(context, thumbnails_generated)
        
        return context.clips_found, thumbnails_generated
    
    def _initialize_context(
        self,
        guild_id: str,
        channel_id: str,
        settings
    ) -> BatchContext:
        """Initialize batch context with settings"""
        settings_hash = compute_settings_hash(settings)
        return BatchContext(
            guild_id=guild_id,
            channel_id=channel_id,
            settings=settings,
            settings_hash=settings_hash
        )
    
    async def _collect_message_data(
        self,
        messages: List[discord.Message],
        clip_map: dict,
        context: BatchContext
    ) -> None:
        """Collect user, message, and clip data from messages"""
        for message in messages:
            message_id = str(message.id)
            
            # Skip messages without clips
            if message_id not in clip_map:
                continue
            
            # Add user data
            context.add_user(message.author)
            
            # Add message data
            context.add_message(
                message_id=message_id,
                author_id=str(message.author.id),
                timestamp=message.created_at,
                content=message.content or ""
            )
            
            # Process clips for this message
            for clip_info in clip_map[message_id]:
                context.add_clip(
                    clip_id=clip_info.clip_id,
                    message_id=clip_info.message_id,
                    filename=clip_info.filename,
                    file_size=clip_info.file_size,
                    mime_type=clip_info.mime_type,
                    cdn_url=clip_info.cdn_url,
                    expires_at=clip_info.expires_at,
                    thumbnail_status="pending"
                )
    
    async def _bulk_upsert_data(self, context: BatchContext) -> None:
        """Bulk upsert users, messages, and clips"""
        await self.db_ops.bulk_upsert_users(context)
        await self.db_ops.bulk_upsert_messages(context)
        await self.db_ops.bulk_upsert_clips(context)
    
    async def _generate_thumbnails(self, context: BatchContext) -> int:
        """Generate thumbnails for clips that need them"""
        thumbnails_generated = 0
        
        if not context.clips_needing_thumbnails:
            return 0
        
        logger.info(
            f"Generating thumbnails for {len(context.clips_needing_thumbnails)} clips"
        )
        
        # Bulk fetch clips to avoid N+1 query pattern
        clip_ids = [c.id for c in context.clips_needing_thumbnails]
        clips = await Clip.filter(id__in=clip_ids).all()
        clips_map = {c.id: c for c in clips}
        
        for clip_data in context.clips_needing_thumbnails:
            clip = clips_map.get(clip_data.id)
            if clip:
                success = await self.thumbnail_handler.process_clip(clip)
                if success:
                    thumbnails_generated += 1
                    context.thumbnails_generated += 1
        
        return thumbnails_generated
    
    def _log_summary(self, context: BatchContext, thumbnails_generated: int) -> None:
        """Log batch processing summary"""
        logger.info(
            f"Batch processing complete: {context.clips_found} clips found, "
            f"{context.thumbnails_skipped} thumbnails skipped, "
            f"{thumbnails_generated} thumbnails generated"
        )
