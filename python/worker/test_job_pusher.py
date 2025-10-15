"""
Test script to push jobs to Redis queue

This script validates that guild/channel settings exist in the database
before pushing jobs to Redis.
"""
import asyncio
import logging
from dotenv import load_dotenv
from worker.redis.redis_client import RedisStreamClient
from worker.redis.redis import BatchScanJob, MessageScanJob
from shared.db.utils import init_db, close_db
from shared.settings_resolver import get_channel_settings
from shared.db.models import Guild, Channel

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def validate_guild_channel(guild_id: str, channel_id: str):
    """
    Validate that guild and channel exist in database and have settings.
    
    Currently raises an error if guild/channel don't exist.
    
    Future enhancement: Could fall back to default settings from 
    settings.default.jsonc if guild/channel settings don't exist.
    
    Raises:
        ValueError: If guild, channel, or settings don't exist
    """
    # Check guild exists
    guild = await Guild.get_or_none(id=guild_id)
    if not guild:
        raise ValueError(f"Guild {guild_id} not found in database. Please sync guilds first.")
    
    # Check channel exists
    channel = await Channel.get_or_none(id=channel_id, guild_id=guild_id)
    if not channel:
        raise ValueError(f"Channel {channel_id} not found in guild {guild_id}. Please sync channels first.")
    
    # Fetch settings (will use defaults if no overrides exist)
    settings = await get_channel_settings(guild_id, channel_id)
    
    logger.info(f"✅ Guild: {guild.name} ({guild_id})")
    logger.info(f"✅ Channel: {channel.name} ({channel_id})")
    logger.info(f"✅ Settings resolved:")
    logger.info(f"   - Allowed MIME types: {settings.allowed_mime_types}")
    logger.info(f"   - Match regex: {settings.match_regex or 'None'}")
    logger.info(f"   - Store message content: {settings.enable_message_content_storage}")
    
    return settings


async def push_test_batch_job():
    """Push a test batch scan job to Redis"""
    # Initialize database
    await init_db()
    
    redis_client = RedisStreamClient()
    
    try:
        # Real guild and channel IDs
        guild_id = "928427413694734396"
        channel_id = "1424914917202464798"
        
        logger.info("Validating guild and channel settings...")
        
        # Validate settings exist (will raise if not found)
        settings = await validate_guild_channel(guild_id, channel_id)
        
        # Connect to Redis
        await redis_client.connect()
        
        # Create a test batch job (NO settings field!)
        job = BatchScanJob(
            guild_id=guild_id,
            channel_id=channel_id,
            direction="backward",
            limit=50,
            before_message_id=None,  # Start from most recent
            after_message_id=None
        )
        
        # Convert to dict for Redis (mode='json' serializes datetime to ISO format)
        job_data = job.model_dump(mode='json')
        
        # Push to Redis
        message_id = await redis_client.push_job(job_data)
        
        logger.info(f"✅ Pushed batch scan job: {job.job_id}")
        logger.info(f"   Redis message ID: {message_id}")
        logger.info(f"   Stream: jobs:guild:{guild_id}:batch")
        logger.info(f"   Guild: {job.guild_id}")
        logger.info(f"   Channel: {job.channel_id}")
        logger.info(f"   Direction: {job.direction}")
        logger.info(f"   Limit: {job.limit}")
        
    except ValueError as e:
        logger.error(f"❌ Validation failed: {e}")
        logger.error("Please ensure the guild and channel exist in the database.")
        logger.error("You may need to sync guilds/channels from Discord first.")
    except Exception as e:
        logger.error(f"❌ Failed to push job: {e}", exc_info=True)
    finally:
        await redis_client.disconnect()
        await close_db()


async def push_test_message_job():
    """Push a test message scan job to Redis"""
    # Initialize database
    await init_db()
    
    redis_client = RedisStreamClient()
    
    try:
        # Real guild and channel IDs
        guild_id = "928427413694734396"
        channel_id = "1424914917202464798"
        
        logger.info("Validating guild and channel settings...")
        
        # Validate settings exist (will raise if not found)
        settings = await validate_guild_channel(guild_id, channel_id)
        
        # Connect to Redis
        await redis_client.connect()
        
        # Create a test message job (NO settings field!)
        job = MessageScanJob(
            guild_id=guild_id,
            channel_id=channel_id,
            message_ids=["1427934841126654055", "1425195412439961653"]  # Replace with real message IDs
        )
        
        # Convert to dict for Redis (mode='json' serializes datetime to ISO format)
        job_data = job.model_dump(mode='json')
        
        # Push to Redis
        message_id = await redis_client.push_job(job_data)
        
        logger.info(f"✅ Pushed message scan job: {job.job_id}")
        logger.info(f"   Redis message ID: {message_id}")
        logger.info(f"   Stream: jobs:guild:{guild_id}:message")
        logger.info(f"   Guild: {job.guild_id}")
        logger.info(f"   Channel: {job.channel_id}")
        logger.info(f"   Messages: {len(job.message_ids)}")
        
    except ValueError as e:
        logger.error(f"❌ Validation failed: {e}")
        logger.error("Please ensure the guild and channel exist in the database.")
    except Exception as e:
        logger.error(f"❌ Failed to push job: {e}", exc_info=True)
    finally:
        await redis_client.disconnect()
        await close_db()


async def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("Discord Clip Saver - Test Job Pusher")
    print("="*60 + "\n")
    
    print("Select job type to push:")
    print("1. Batch Scan Job (scan N messages from a channel)")
    print("2. Message Scan Job (scan specific message IDs)")
    print("3. Push both")
    print()
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == "1":
        await push_test_batch_job()
    elif choice == "2":
        await push_test_message_job()
    elif choice == "3":
        await push_test_batch_job()
        await push_test_message_job()
    else:
        print("Invalid choice")
        return
    
    print("\n" + "="*60)
    print("✅ Job(s) pushed successfully!")
    print("The worker should pick them up and process them.")
    print("="*60 + "\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Cancelled by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        exit(1)
