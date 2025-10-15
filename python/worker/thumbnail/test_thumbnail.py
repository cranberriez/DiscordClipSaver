"""
Test script for thumbnail generation

This script tests the thumbnail generator with a video URL without requiring
a full database setup. It creates a mock Clip object and tests the thumbnail
generation process.

Usage:
    python -m worker.thumbnail.test_thumbnail
"""
import asyncio
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from worker.thumbnail.thumbnail_generator import ThumbnailGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION - Update this URL with your test video
# ============================================================================
TEST_VIDEO_URL = "https://cdn.discordapp.com/attachments/675233762900049930/1393986677286113354/L-bozo.mp4?ex=68f117c2&is=68efc642&hm=f853242ed01d2850f3b5afa3f72611b1ccc0af6aa42fa3cd7e10f71f3305a5cd&"

# Mock clip data
MOCK_CLIP_DATA = {
    "id": "HASHASHASHASH123MD5",
    "guild_id": "928427413694734396",
    "channel_id": "123456789",
    "message_id": "987654321",
    "filename": "test_video.mp4",
    "file_size": 1024000,
    "mime_type": "video/mp4",
    "cdn_url": TEST_VIDEO_URL,
    "expires_at": datetime.now(),
    "thumbnail_status": "pending"
}


class MockClip:
    """Mock Clip object for testing without database"""
    
    def __init__(self, data: dict):
        for key, value in data.items():
            setattr(self, key, value)
    
    def __repr__(self):
        return f"MockClip(id={self.id}, filename={self.filename})"


async def test_ffmpeg_detection():
    """Test that FFmpeg is properly detected"""
    logger.info("=" * 60)
    logger.info("Testing FFmpeg Detection")
    logger.info("=" * 60)
    
    try:
        generator = ThumbnailGenerator()
        logger.info(f"[OK] FFmpeg found at: {generator.ffmpeg_path}")
        return generator
    except RuntimeError as e:
        logger.error(f"[FAIL] FFmpeg not found: {e}")
        logger.error("Please install FFmpeg following the instructions in python/worker/README.md")
        return None


async def test_thumbnail_generation(generator: ThumbnailGenerator):
    """Test thumbnail generation with mock clip"""
    logger.info("")
    logger.info("=" * 60)
    logger.info("Testing Thumbnail Generation")
    logger.info("=" * 60)
    logger.info(f"Test video URL: {TEST_VIDEO_URL}")
    logger.info("")
    
    # Create mock clip
    mock_clip = MockClip(MOCK_CLIP_DATA)
    
    try:
        # Generate thumbnails (small and large)
        small_path, large_path = await generator.generate_for_clip(mock_clip)
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("[OK] Test completed successfully!")
        logger.info(f"Small thumbnail: {small_path}")
        logger.info(f"Large thumbnail: {large_path}")
        logger.info("=" * 60)
            
    except Exception as e:
        logger.error("")
        logger.error("=" * 60)
        logger.error(f"[ERROR] Error during thumbnail generation: {e}")
        logger.error("=" * 60)
        raise


async def main():
    """Main test function"""
    logger.info("Starting Thumbnail Generator Test")
    logger.info("")
    
    # Test 1: FFmpeg detection
    generator = await test_ffmpeg_detection()
    if not generator:
        logger.error("Cannot proceed without FFmpeg")
        sys.exit(1)
    
    # Test 2: Thumbnail generation
    await test_thumbnail_generation(generator)
    
    logger.info("")
    logger.info("All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())
