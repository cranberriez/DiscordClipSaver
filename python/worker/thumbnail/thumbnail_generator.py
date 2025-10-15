"""
Thumbnail generator for video clips

Requires ffmpeg to be installed on the system:
- Docker: Installed via Dockerfile
- Local: See worker/README.md for platform-specific installation
"""
import logging
import os
import shutil
from pathlib import Path
from shared.db.models import Clip
from shared.storage import get_storage_backend

logger = logging.getLogger(__name__)


class ThumbnailGenerator:
    """Generates thumbnails for video clips"""
    
    def __init__(self):
        """Initialize the thumbnail generator"""
        self.storage = get_storage_backend()
        
        # Find ffmpeg binary (check local installation first, then system PATH)
        self.ffmpeg_path = self._find_ffmpeg()
        if not self.ffmpeg_path:
            logger.error(
                "FFmpeg not found in local bin/ directory or system PATH. "
                "See python/worker/README.md for installation instructions."
            )
            raise RuntimeError(
                "FFmpeg is required for thumbnail generation but was not found. "
                "Install ffmpeg locally (bin/ffmpeg/) or in your system PATH."
            )
        
        logger.info(f"ThumbnailGenerator initialized with storage: {type(self.storage).__name__}")
        logger.info(f"FFmpeg found at: {self.ffmpeg_path}")
    
    def _find_ffmpeg(self) -> str | None:
        """
        Find ffmpeg binary, checking local installation first, then system PATH.
        
        Returns:
            Path to ffmpeg binary, or None if not found
        """
        # Check for local installation in project root
        # Supports both running from worker/ and from project root
        project_root = Path(__file__).parent.parent.parent.parent  # Go up to project root
        local_ffmpeg_paths = [
            project_root / "bin" / "ffmpeg" / "bin" / "ffmpeg.exe",  # Windows
            project_root / "bin" / "ffmpeg" / "bin" / "ffmpeg",      # Unix
            project_root / "bin" / "ffmpeg" / "ffmpeg.exe",          # Windows (alternative)
            project_root / "bin" / "ffmpeg" / "ffmpeg",              # Unix (alternative)
        ]
        
        for path in local_ffmpeg_paths:
            if path.exists() and path.is_file():
                logger.debug(f"Found local ffmpeg at: {path}")
                return str(path)
        
        # Fall back to system PATH
        system_ffmpeg = shutil.which("ffmpeg")
        if system_ffmpeg:
            logger.debug(f"Found system ffmpeg at: {system_ffmpeg}")
            return system_ffmpeg
        
        return None
    
    async def generate_for_clip(self, clip: Clip) -> bool:
        """
        Generate a thumbnail for a clip
        
        Args:
            clip: Clip model instance
            
        Returns:
            True if thumbnail was generated successfully
            
        TODO:
            - Download video from clip.cdn_url
            - Extract frame at specific timestamp (e.g., 1 second in)
            - Resize to thumbnail dimensions (e.g., 320x180)
            - Save as WebP format
            - Upload to storage (local or S3)
            - Create Thumbnail record in database
        """
        logger.info(f"🎬 Generating thumbnail for clip: {clip.id}")
        logger.info(f"   Filename: {clip.filename}")
        logger.info(f"   MIME type: {clip.mime_type}")
        logger.info(f"   File size: {clip.file_size} bytes")
        logger.info(f"   CDN URL: {clip.cdn_url[:80]}...")
        
        # TODO: Implement actual thumbnail generation
        # For now, just demonstrate storage usage with a placeholder
        
        # Example storage path: thumbnails/guild_123/clip_abc.webp
        storage_path = f"thumbnails/guild_{clip.guild_id}/clip_{clip.id}.webp"
        
        # In the future, this would be actual thumbnail data
        # For now, just a placeholder
        placeholder_data = b"placeholder thumbnail data"
        
        # Save to storage (works with local, Docker volume, or GCS)
        saved_path = await self.storage.save(placeholder_data, storage_path)
        logger.info(f"   💾 Saved thumbnail to: {saved_path}")
        
        # Get public URL
        public_url = self.storage.get_public_url(storage_path)
        logger.info(f"   🔗 Public URL: {public_url}")
        
        logger.info(f"   ✅ Thumbnail generation complete (stub)")
        
        return True
