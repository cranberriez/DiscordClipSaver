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
from shared.db.models import Guild, Channel, ScanStatus
from shared.db.repositories.channel_scan_status import (
    get_or_create_scan_status,
    update_scan_status,
    increment_scan_counts
)
from shared.redis.redis_client import RedisStreamClient
from shared.redis.redis import BatchScanJob

logger = logging.getLogger(__name__)


class JobProcessor:
    """Processes jobs from the Redis queue"""
    
    def __init__(self, bot: WorkerBot, thumbnail_generator=None, redis_client: Optional[RedisStreamClient] = None):
        self.bot = bot
        self.message_handler = MessageHandler()
        self.thumbnail_generator = thumbnail_generator
        self.redis_client = redis_client
    
    async def validate_scan_enabled(self, guild_id: str, channel_id: str) -> tuple[bool, Optional[str]]:
        """
        Validate that both guild and channel have message scanning enabled.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
            
        Returns:
            Tuple of (is_enabled, error_message)
        """
        # Check guild scan enabled
        guild = await Guild.get_or_none(id=str(guild_id))
        if not guild:
            return False, "Guild not found in database"
        
        if not guild.message_scan_enabled:
            return False, "Guild scanning disabled"
        
        # Check channel scan enabled
        channel = await Channel.get_or_none(id=str(channel_id))
        if not channel:
            return False, "Channel not found in database"
        
        if not channel.message_scan_enabled:
            return False, "Channel scanning disabled for this channel"
        
        return True, None
    
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
        auto_continue = job_data.get("auto_continue", True)
        
        logger.info(f"Processing batch scan: channel={channel_id}, direction={direction}, limit={limit}")
        
        try:
            # Get or create scan status
            scan_status = await get_or_create_scan_status(guild_id, channel_id)
            
            # Validate guild and channel scan enabled flags
            is_enabled, error_message = await self.validate_scan_enabled(guild_id, channel_id)
            
            if not is_enabled:
                logger.warning(f"Scan disabled for channel {channel_id}: {error_message}")
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.CANCELLED,
                    error_message=error_message
                )
                return
            
            # Update status to running
            await update_scan_status(
                guild_id=guild_id,
                channel_id=channel_id,
                status=ScanStatus.RUNNING,
                error_message=None
            )
            
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
            
            # Update scan counts
            await increment_scan_counts(
                guild_id=guild_id,
                channel_id=channel_id,
                messages_scanned=len(messages),
                clips_found=total_clips
            )
            
            # Track message IDs for continuation
            continuation_needed = False
            if messages:
                if direction == "backward":
                    # Oldest message is the last in the list
                    oldest_message_id = str(messages[-1].id)
                    await update_scan_status(
                        guild_id=guild_id,
                        channel_id=channel_id,
                        backward_message_id=oldest_message_id
                    )
                    # If we got a full batch, there might be more messages
                    continuation_needed = len(messages) >= limit
                    
                elif direction == "forward":
                    # Newest message is the last in the list
                    newest_message_id = str(messages[-1].id)
                    await update_scan_status(
                        guild_id=guild_id,
                        channel_id=channel_id,
                        forward_message_id=newest_message_id
                    )
                    # If we got a full batch, there might be more messages
                    continuation_needed = len(messages) >= limit
            
            # Queue continuation job if needed and allowed
            if continuation_needed and auto_continue and self.redis_client:
                logger.info(f"Queueing continuation job for channel {channel_id} (direction: {direction})")
                
                continuation_job = BatchScanJob(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    direction=direction,
                    limit=limit,
                    before_message_id=oldest_message_id if direction == "backward" else before_message_id,
                    after_message_id=newest_message_id if direction == "forward" else after_message_id,
                    auto_continue=True  # Preserve auto_continue for continuation jobs
                )
                
                await self.redis_client.push_job(continuation_job.model_dump())
                
                # Keep status as RUNNING since continuation is queued
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.RUNNING
                )
            else:
                # No more messages, auto_continue disabled, or no continuation needed - mark as succeeded
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.SUCCEEDED
                )
                
                if not auto_continue and continuation_needed:
                    logger.info(f"Batch scan complete but auto_continue=False, not queueing continuation")
            
            logger.info(f"Batch scan complete: processed {len(messages)} messages, found {total_clips} clips")
            
        except Exception as e:
            logger.error(f"Batch scan failed for channel {channel_id}: {e}", exc_info=True)
            
            # Update status to failed
            await update_scan_status(
                guild_id=guild_id,
                channel_id=channel_id,
                status=ScanStatus.FAILED,
                error_message=str(e)
            )
            
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
            # Validate guild and channel scan enabled flags
            is_enabled, error_message = await self.validate_scan_enabled(guild_id, channel_id)
            
            if not is_enabled:
                logger.debug(f"Scan disabled for channel {channel_id}: {error_message}")
                # Don't update scan status for real-time messages - just skip silently
                return
            
            # Fetch the Discord channel
            discord_channel = await self.bot.fetch_channel(int(channel_id))
            
            # Process each message
            total_clips = 0
            processed_message_ids = []
            
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
                    processed_message_ids.append(message_id)
                    
                except Exception as e:
                    logger.error(f"Failed to process message {message_id}: {e}")
                    continue
            
            # Update forward_message_id to the newest message processed
            # This prevents gap detection from re-scanning these messages
            if processed_message_ids:
                # Message IDs are snowflakes - larger = newer
                newest_message_id = max(processed_message_ids, key=lambda x: int(x))
                
                # Get current forward_message_id to compare
                scan_status = await get_or_create_scan_status(guild_id, channel_id)
                current_forward_id = scan_status.forward_message_id
                
                # Only update if this message is newer than what we have
                if not current_forward_id or int(newest_message_id) > int(current_forward_id):
                    await update_scan_status(
                        guild_id=guild_id,
                        channel_id=channel_id,
                        forward_message_id=newest_message_id
                    )
                    logger.debug(f"Updated forward_message_id to {newest_message_id} for channel {channel_id}")
            
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