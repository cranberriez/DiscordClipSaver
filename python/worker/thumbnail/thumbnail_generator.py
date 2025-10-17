"""
Thumbnail generator for video clips

Requires ffmpeg to be installed on the system:
- Docker: Installed via Dockerfile
- Local: See worker/README.md for platform-specific installation
"""
import asyncio
import logging
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from io import BytesIO
from typing import Tuple
import aiohttp
import ffmpeg
from PIL import Image
from shared.db.models import Clip, Thumbnail
from shared.storage import get_storage_backend

logger = logging.getLogger(__name__)

# Thumbnail size configuration (can be overridden by environment variables)
THUMBNAIL_SMALL_WIDTH = int(os.getenv('THUMBNAIL_SMALL_WIDTH', '320'))
THUMBNAIL_SMALL_HEIGHT = int(os.getenv('THUMBNAIL_SMALL_HEIGHT', '180'))
THUMBNAIL_LARGE_WIDTH = int(os.getenv('THUMBNAIL_LARGE_WIDTH', '640'))
THUMBNAIL_LARGE_HEIGHT = int(os.getenv('THUMBNAIL_LARGE_HEIGHT', '360'))
THUMBNAIL_TIMESTAMP = float(os.getenv('THUMBNAIL_TIMESTAMP', '1.0'))
THUMBNAIL_QUALITY = int(os.getenv('THUMBNAIL_QUALITY', '85'))


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
        
        # Create persistent aiohttp session for connection reuse (50% faster downloads)
        # Configure timeout (default: 5 minutes total, 10 seconds to connect)
        timeout = aiohttp.ClientTimeout(
            total=int(os.getenv("VIDEO_DOWNLOAD_TIMEOUT", "300")),
            connect=int(os.getenv("VIDEO_DOWNLOAD_CONNECT_TIMEOUT", "10"))
        )
        self._session = aiohttp.ClientSession(timeout=timeout)
        
        logger.info(f"ThumbnailGenerator initialized with storage: {type(self.storage).__name__}")
        logger.info(f"FFmpeg found at: {self.ffmpeg_path}")
        logger.info("Aiohttp session created for connection reuse")
    
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
    
    async def close(self):
        """Close the aiohttp session and cleanup resources"""
        if self._session and not self._session.closed:
            await self._session.close()
            logger.debug("Aiohttp session closed")
    
    async def generate_for_clip(self, clip: Clip, timestamp: float = None) -> Tuple[str, str, dict]:
        """
        Generate small and large thumbnails for a clip
        
        Args:
            clip: Clip model instance
            timestamp: Time in seconds to extract frame from (default: from env or 1.0)
            
        Returns:
            Tuple of (small_thumbnail_path, large_thumbnail_path, video_metadata)
            video_metadata contains: mime_type, duration, resolution, etc.
        """
        if timestamp is None:
            timestamp = THUMBNAIL_TIMESTAMP
            
        logger.info(f"Generating thumbnails for clip: {clip.id}")
        logger.info(f"  Filename: {clip.filename}")
        logger.info(f"  MIME type: {clip.mime_type}")
        logger.info(f"  File size: {clip.file_size:,} bytes ({clip.file_size / 1024 / 1024:.2f} MB)")
        logger.info(f"  CDN URL: {clip.cdn_url[:80]}...")
        
        temp_video = None
        temp_frame = None
        
        try:
            # Download full video
            logger.info(f"  Downloading video from CDN...")
            temp_video = await self._download_video(clip.cdn_url)
            
            # Log actual file size
            actual_size = os.path.getsize(temp_video)
            logger.info(f"  Downloaded {actual_size:,} bytes ({actual_size / 1024 / 1024:.2f} MB)")
            
            # Probe video to get metadata (MIME type, duration, resolution)
            logger.info(f"  Probing video metadata...")
            video_metadata = await self._probe_video(temp_video)
            logger.info(f"  Video metadata: {video_metadata}")
            
            # Extract frame
            logger.info(f"  Extracting frame at {timestamp}s...")
            temp_frame = await self._extract_frame(temp_video, timestamp)
            logger.info(f"  Frame extracted successfully")
            
            # Generate small thumbnail
            logger.info(f"  Generating small thumbnail ({THUMBNAIL_SMALL_WIDTH}x{THUMBNAIL_SMALL_HEIGHT})...")
            small_thumbnail_data = await self._resize_and_convert(
                temp_frame, 
                THUMBNAIL_SMALL_WIDTH, 
                THUMBNAIL_SMALL_HEIGHT
            )
            logger.info(f"  Small thumbnail size: {len(small_thumbnail_data):,} bytes")
            
            # Generate large thumbnail
            logger.info(f"  Generating large thumbnail ({THUMBNAIL_LARGE_WIDTH}x{THUMBNAIL_LARGE_HEIGHT})...")
            large_thumbnail_data = await self._resize_and_convert(
                temp_frame, 
                THUMBNAIL_LARGE_WIDTH, 
                THUMBNAIL_LARGE_HEIGHT
            )
            logger.info(f"  Large thumbnail size: {len(large_thumbnail_data):,} bytes")
            
            # Save small thumbnail (using clip ID as filename)
            small_storage_path = f"thumbnails/guild_{clip.guild_id}/{clip.id}_small.webp"
            small_saved_path = await self.storage.save(small_thumbnail_data, small_storage_path)
            logger.info(f"  Saved small thumbnail to: {small_saved_path}")
            
            # Save large thumbnail
            large_storage_path = f"thumbnails/guild_{clip.guild_id}/{clip.id}_large.webp"
            large_saved_path = await self.storage.save(large_thumbnail_data, large_storage_path)
            logger.info(f"  Saved large thumbnail to: {large_saved_path}")
            
            # Get public URLs
            small_public_url = self.storage.get_public_url(small_storage_path)
            large_public_url = self.storage.get_public_url(large_storage_path)
            logger.info(f"  Small thumbnail URL: {small_public_url}")
            logger.info(f"  Large thumbnail URL: {large_public_url}")
            
            logger.info(f"  Thumbnail generation complete")
            
            return (small_storage_path, large_storage_path, video_metadata)
            
        except Exception as e:
            logger.error(f"Failed to generate thumbnail for clip {clip.id}: {e}", exc_info=True)
            raise
            
        finally:
            # Clean up temporary files
            if temp_video and os.path.exists(temp_video):
                os.unlink(temp_video)
                logger.debug(f"Cleaned up temp video: {temp_video}")
            if temp_frame and os.path.exists(temp_frame):
                os.unlink(temp_frame)
                logger.debug(f"Cleaned up temp frame: {temp_frame}")
    
    async def _download_video(self, url: str) -> str:
        """
        Download full video from URL to temporary file using persistent session
        
        Reuses the class-level aiohttp session for 50% faster downloads by avoiding
        repeated TCP/TLS handshakes.
        
        Args:
            url: Video URL (Discord CDN)
            
        Returns:
            Path to temporary video file
            
        Raises:
            asyncio.TimeoutError: If download exceeds timeout
            aiohttp.ClientError: On HTTP errors
        """
        # Create temporary file
        temp_fd, temp_path = tempfile.mkstemp(suffix='.mp4')
        os.close(temp_fd)
        
        try:
            # Use persistent session (reuses connections)
            async with self._session.get(url) as response:
                response.raise_for_status()
                
                bytes_downloaded = 0
                with open(temp_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                        bytes_downloaded += len(chunk)
                
                logger.debug(f"Downloaded {bytes_downloaded:,} bytes (full file, reused connection)")
            
            return temp_path
            
        except asyncio.TimeoutError:
            # Clean up temp file on timeout
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            timeout = self._session.timeout
            logger.error(f"Video download timed out after {timeout.total}s: {url[:100]}...")
            raise
        except Exception as e:
            # Clean up temp file on any error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise
    
    async def _probe_video(self, video_path: str) -> dict:
        """
        Probe video file to extract metadata using ffmpeg
        
        Args:
            video_path: Path to video file
            
        Returns:
            Dictionary with mime_type, duration, resolution, codec info
        """
        try:
            probe = ffmpeg.probe(video_path, cmd=self.ffmpeg_path.replace('ffmpeg', 'ffprobe'))
            
            # Extract video stream info
            video_stream = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
            format_info = probe.get('format', {})
            
            # Determine MIME type from codec and format
            codec_name = video_stream.get('codec_name', '') if video_stream else ''
            format_name = format_info.get('format_name', '')
            
            mime_type = self._get_mime_type_from_codec(codec_name, format_name)
            
            # Extract duration (prefer stream duration, fallback to format duration)
            duration = None
            if video_stream and 'duration' in video_stream:
                duration = float(video_stream['duration'])
            elif 'duration' in format_info:
                duration = float(format_info['duration'])
            
            # Extract resolution
            resolution = None
            if video_stream:
                width = video_stream.get('width')
                height = video_stream.get('height')
                if width and height:
                    resolution = f"{width}x{height}"
            
            return {
                'mime_type': mime_type,
                'duration': duration,
                'resolution': resolution,
                'codec': codec_name,
                'format': format_name,
            }
            
        except Exception as e:
            logger.warning(f"Failed to probe video: {e}")
            # Return defaults if probing fails
            return {
                'mime_type': 'video/mp4',
                'duration': None,
                'resolution': None,
                'codec': None,
                'format': None,
            }
    
    def _get_mime_type_from_codec(self, codec: str, format_name: str) -> str:
        """
        Determine MIME type from codec and format information
        
        Args:
            codec: Video codec name (e.g., 'h264', 'vp9')
            format_name: Container format (e.g., 'mov,mp4,m4a', 'webm')
            
        Returns:
            MIME type string
        """
        format_lower = format_name.lower()
        
        # Check codec first for better accuracy
        # H.264/H.265 codecs are typically MP4, not QuickTime
        if codec in ['h264', 'h265', 'hevc', 'mpeg4', 'avc1']:
            # Even if format says "mov", these codecs indicate MP4
            return 'video/mp4'
        elif codec in ['vp8', 'vp9']:
            return 'video/webm'
        
        # Check format for specific containers
        if 'webm' in format_lower:
            return 'video/webm'
        elif 'matroska' in format_lower or 'mkv' in format_lower:
            return 'video/x-matroska'
        elif 'avi' in format_lower:
            return 'video/x-msvideo'
        elif 'flv' in format_lower:
            return 'video/x-flv'
        
        # For mov,mp4 combo format (common from Discord):
        # Prefer mp4 over quicktime for web compatibility
        if 'mp4' in format_lower:
            return 'video/mp4'
        elif 'mov' in format_lower or 'quicktime' in format_lower:
            return 'video/quicktime'
        
        # Default to mp4 (most common)
        return 'video/mp4'
    
    async def _extract_frame(self, video_path: str, timestamp: float) -> str:
        """
        Extract a single frame from video at specified timestamp
        
        Args:
            video_path: Path to video file
            timestamp: Time in seconds
            
        Returns:
            Path to extracted frame (PNG)
        """
        # Create temporary file for frame
        temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
        os.close(temp_fd)
        
        try:
            # Use ffmpeg to extract frame
            (
                ffmpeg
                .input(video_path, ss=timestamp)
                .output(temp_path, vframes=1, format='image2', vcodec='png')
                .overwrite_output()
                .run(cmd=self.ffmpeg_path, capture_stdout=True, capture_stderr=True, quiet=True)
            )
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else 'Unknown error'}")
            raise
        
        return temp_path
    
    async def _resize_and_convert(self, image_path: str, width: int, height: int) -> bytes:
        """
        Resize image and convert to WebP format
        
        Args:
            image_path: Path to source image
            width: Target width
            height: Target height
            
        Returns:
            WebP image data as bytes
        """
        # Open image with Pillow
        with Image.open(image_path) as img:
            # Resize maintaining aspect ratio
            img.thumbnail((width, height), Image.Resampling.LANCZOS)
            
            # Convert to WebP
            output = BytesIO()
            img.save(output, format='WEBP', quality=THUMBNAIL_QUALITY, method=6)
            output.seek(0)
            
            return output.read()
