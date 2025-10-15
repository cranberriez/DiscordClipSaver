"""
Job processor for handling different job types
"""
import logging
from typing import Optional
from worker.redis.redis import BatchScanJob, MessageScanJob, RescanJob, ThumbnailRetryJob
from worker.discord.bot import WorkerBot
from worker.discord.get_message_history import get_message_history
from worker.discord.get_message import get_message
from worker.message.message_handler import MessageHandler

logger = logging.getLogger(__name__)


class JobProcessor:
    """Processes jobs from the Redis queue"""
    
    def __init__(self, bot: WorkerBot, thumbnail_generator=None):
        self.bot = bot
        self.message_handler = MessageHandler()
        self.thumbnail_generator = thumbnail_generator
    
    async def process_job(self, job_data: dict):
        """
        Route job to appropriate handler based on type
        
        Args:
            job_data: Job dictionary from Redis
        """
        job_type = job_data.get("type")
        
        if job_type == "batch":
            await self.process_batch_scan(job_data)
        elif job_type == "message":
            await self.process_message_scan(job_data)
        elif job_type == "rescan":
            await self.process_rescan(job_data)
        elif job_type == "thumbnail_retry":
            await self.process_thumbnail_retry(job_data)
        else:
            logger.error(f"Unknown job type: {job_type}")
            raise ValueError(f"Unknown job type: {job_type}")
    
    async def process_batch_scan(self, job_data: dict):
        """
        Process batch scan job - scans N messages from a channel
        
        Args:
            job_data: BatchScanJob data
        """
        channel_id = job_data["channel_id"]
        guild_id = job_data["guild_id"]
        direction = job_data.get("direction", "backward")
        limit = job_data.get("limit", 100)
        before_message_id = job_data.get("before_message_id")
        after_message_id = job_data.get("after_message_id")
        
        logger.info(f"Processing batch scan: channel={channel_id}, direction={direction}, limit={limit}")
        
        try:
            # Fetch the Discord channel
            discord_channel = await self.bot.fetch_channel(int(channel_id))
            
            # Fetch message history
            messages = await get_message_history(
                channel=discord_channel,
                limit=limit,
                before_id=int(before_message_id) if before_message_id else None,
                after_id=int(after_message_id) if after_message_id else None,
                direction=direction
            )
            
            logger.info(f"Fetched {len(messages)} messages from channel {channel_id}")
            
            # Process each message
            total_clips = 0
            for discord_message in messages:
                clips_found = await self.message_handler.process_message(
                    discord_message=discord_message,
                    channel_id=channel_id,
                    guild_id=guild_id,
                    thumbnail_generator=self.thumbnail_generator
                )
                total_clips += clips_found
            
            logger.info(f"Batch scan complete: processed {len(messages)} messages, found {total_clips} clips")
            
        except Exception as e:
            logger.error(f"Batch scan failed for channel {channel_id}: {e}", exc_info=True)
            raise
    
    async def process_message_scan(self, job_data: dict):
        """
        Process specific messages (real-time from bot events)
        
        Args:
            job_data: MessageScanJob data
        """
        channel_id = job_data["channel_id"]
        guild_id = job_data["guild_id"]
        message_ids = job_data["message_ids"]
        
        logger.info(f"Processing message scan: channel={channel_id}, messages={len(message_ids)}")
        
        try:
            # Fetch the Discord channel
            discord_channel = await self.bot.fetch_channel(int(channel_id))
            
            # Process each message
            total_clips = 0
            for message_id in message_ids:
                try:
                    # Fetch the specific message
                    discord_message = await get_message(discord_channel, int(message_id))
                    
                    # Process the message
                    clips_found = await self.message_handler.process_message(
                        discord_message=discord_message,
                        channel_id=channel_id,
                        guild_id=guild_id,
                        thumbnail_generator=self.thumbnail_generator
                    )
                    total_clips += clips_found
                    
                except Exception as e:
                    logger.error(f"Failed to process message {message_id}: {e}")
                    continue
            
            logger.info(f"Message scan complete: processed {len(message_ids)} messages, found {total_clips} clips")
            
        except Exception as e:
            logger.error(f"Message scan failed for channel {channel_id}: {e}", exc_info=True)
            raise
    
    async def process_rescan(self, job_data: dict):
        """
        Process rescan job - triggered by settings change
        
        Args:
            job_data: RescanJob data
        """
        channel_id = job_data["channel_id"]
        guild_id = job_data["guild_id"]
        reason = job_data.get("reason", "unknown")
        reset_scan_status = job_data.get("reset_scan_status", False)
        
        logger.info(f"Processing rescan: channel={channel_id}, reason={reason}")
        
        # For now, treat rescan as a full backward scan
        # In the future, this could be optimized to only reprocess affected clips
        await self.process_batch_scan({
            "type": "batch",
            "channel_id": channel_id,
            "guild_id": guild_id,
            "direction": "backward",
            "limit": 1000,  # Larger limit for rescans
            "before_message_id": None,
            "after_message_id": None
        })
    
    async def process_thumbnail_retry(self, job_data: dict):
        """
        Process thumbnail retry job - retry failed thumbnail generation
        
        Args:
            job_data: ThumbnailRetryJob data
        """
        clip_ids = job_data["clip_ids"]
        retry_count = job_data.get("retry_count", 0)
        
        logger.info(f"Processing thumbnail retry: {len(clip_ids)} clips, retry #{retry_count}")
        
        # TODO: Implement thumbnail retry logic
        # This would fetch clips from database and retry thumbnail generation
        logger.warning("Thumbnail retry not yet implemented")
        pass