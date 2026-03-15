"""
Service for handling message scanning and gap detection
"""
import logging
from typing import Optional
import discord
from shared.db.models import Guild, Channel
from shared.db.repositories.channel_scan_status import get_scan_status
from .message_batcher import get_message_batcher
from shared.redis.redis import BatchScanJob

logger = logging.getLogger(__name__)


class ScanService:
    """Handles message scanning coordination for the bot"""
    
    def __init__(self, redis_client=None):
        """
        Initialize scan service
        
        Args:
            redis_client: RedisStreamClient instance for pushing jobs
        """
        self.redis_client = redis_client
    
    async def detect_and_queue_gaps(self, bot: discord.Client):
        """
        Detect gaps between last known message and current latest message for all enabled channels.
        Called on bot startup to catch up on missed messages.
        
        Args:
            bot: Discord bot client
        """
        if not self.redis_client:
            logger.warning("Redis client not configured, skipping gap detection")
            return
        
        logger.info("Starting gap detection for enabled channels...")
        
        # Get all guilds with scanning enabled
        guilds = await Guild.filter(message_scan_enabled=True, deleted_at=None).all()
        
        total_gaps_found = 0
        
        for guild in guilds:
            try:
                # Get Discord guild
                discord_guild = bot.get_guild(int(guild.id))
                if not discord_guild:
                    logger.debug(f"Guild {guild.id} not found in Discord, skipping")
                    continue
                
                gaps_found = await self.check_guild_gaps(discord_guild, guild)
                total_gaps_found += gaps_found
                        
            except Exception as e:
                logger.error(f"Error detecting gaps for guild {guild.id}: {e}", exc_info=True)
                continue
        
        logger.info(f"Gap detection complete. Found {total_gaps_found} channels with gaps.")

    async def check_guild_gaps(self, discord_guild: discord.Guild, guild_model: Optional[Guild] = None) -> int:
        """
        Check for gaps in all enabled channels of a specific guild.
        
        Args:
            discord_guild: Discord guild object
            guild_model: Optional Guild DB model (fetched if not provided)
            
        Returns:
            Number of channels where gaps were detected
        """
        if not guild_model:
            guild_model = await Guild.get_or_none(id=str(discord_guild.id))
            
        if not guild_model or not guild_model.message_scan_enabled:
            return 0
            
        try:
            # Get all channels with scanning enabled
            channels = await Channel.filter(
                guild_id=guild_model.id,
                message_scan_enabled=True,
                deleted_at=None
            ).all()
            
            gaps_found = 0
            for channel in channels:
                gap_detected = await self._check_and_queue_gap(discord_guild, channel)
                if gap_detected:
                    gaps_found += 1
            
            return gaps_found
        except Exception as e:
            logger.error(f"Error checking gaps for guild {discord_guild.id}: {e}", exc_info=True)
            return 0
    
    async def _check_and_queue_gap(self, discord_guild: discord.Guild, channel: Channel) -> bool:
        """
        Check if a channel has a gap and queue a catch-up scan if needed.
        
        Args:
            discord_guild: Discord guild object
            channel: Channel database model
            
        Returns:
            True if gap was detected and job queued, False otherwise
        """
        try:
            # Get Discord channel
            discord_channel = discord_guild.get_channel(int(channel.id))
            if not discord_channel:
                logger.debug(f"Channel {channel.id} not found in Discord guild {discord_guild.id}")
                return False
            
            # Only check text-based channels
            if not isinstance(discord_channel, (discord.TextChannel, discord.Thread)):
                return False
            
            # Get scan status
            scan_status = await get_scan_status(str(discord_guild.id), str(channel.id))
            
            # If no scan status exists, this is a new channel - no gap to fill
            if not scan_status:
                logger.debug(f"No scan status for channel {channel.id}, skipping gap detection")
                return False
            
            # Get the last known message ID (forward_message_id is the most recent we've seen)
            last_known_message_id = scan_status.forward_message_id
            
            # If we've never scanned forward, no gap to detect
            if not last_known_message_id:
                logger.debug(f"No forward_message_id for channel {channel.id}, skipping gap detection")
                return False
            
            # Fetch the latest message from Discord
            try:
                # Get the most recent message
                latest_messages = [msg async for msg in discord_channel.history(limit=1)]
                
                if not latest_messages:
                    # Channel is empty
                    return False
                
                latest_message_id = str(latest_messages[0].id)
                
                # Check if there's a gap
                if latest_message_id == last_known_message_id:
                    # No gap, we're up to date
                    return False
                
                # Gap detected! Queue a forward scan to catch up
                logger.info(
                    f"Gap detected in channel {channel.id} ({channel.name}): "
                    f"last_known={last_known_message_id}, latest={latest_message_id}"
                )
                
                # Queue a forward scan from last known message to current
                catch_up_job = BatchScanJob(
                    guild_id=str(discord_guild.id),
                    channel_id=str(channel.id),
                    direction="forward",
                    limit=100,
                    after_message_id=last_known_message_id,
                    auto_continue=True  # Continue until caught up
                )
                
                await self.redis_client.push_job(catch_up_job.model_dump(mode='json'))
                
                logger.info(f"Queued catch-up scan for channel {channel.id}")
                return True
                
            except discord.Forbidden:
                logger.warning(f"No permission to read messages in channel {channel.id}")
                return False
            except discord.HTTPException as e:
                logger.error(f"Discord API error checking channel {channel.id}: {e}")
                return False
                
        except Exception as e:
            logger.error(f"Error checking gap for channel {channel.id}: {e}", exc_info=True)
            return False
    
    async def handle_new_message(self, message: discord.Message):
        """
        Handle a new message from Discord.
        Uses MessageBatcher to batch messages with attachments instead of sending individual jobs.
        
        Args:
            message: Discord message object
        """
        # Quick checks (no database queries)
        if message.author.bot:
            return
        
        if not message.attachments:
            return
        
        # Check NSFW channel before batching to avoid processing clips that will be ignored
        guild_id = str(message.guild.id)
        channel_id = str(message.channel.id)
        
        # First check Discord message object for NSFW flag (faster)
        is_nsfw = getattr(message.channel, 'nsfw', False)
        
        # If Discord doesn't have NSFW info, check database
        if not is_nsfw:
            from shared.db.models import Channel
            channel = await Channel.get_or_none(id=channel_id)
            is_nsfw = channel and channel.nsfw
        
        if is_nsfw:
            from worker.settings_helpers.user_settings import check_ignore_nsfw_channels
            if await check_ignore_nsfw_channels(guild_id, channel_id):
                logger.debug(f"Skipping message {message.id} in NSFW channel {channel_id} due to ignore_nsfw_channels setting")
                return
        
        # Has attachments and passed NSFW check - add to batch for processing
        message_batcher = get_message_batcher()
        await message_batcher.add_message(message)
        
        logger.debug(f"Added message {message.id} to batch for channel {channel_id}")
    
    async def handle_message_deletion(self, guild_id: str, channel_id: str, message_id: str):
        """
        Handle a message deletion from Discord.
        First checks if message is in MessageBatcher and removes it if found.
        If not in batch, creates a MessageDeletionJob for worker to clean up database and storage.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
            message_id: Discord message snowflake
        """
        # First, try to remove from MessageBatcher if it's pending
        from .message_batcher import get_message_batcher
        message_batcher = get_message_batcher()
        
        # Convert string IDs to integers for MessageBatcher
        guild_id_int = int(guild_id)
        channel_id_int = int(channel_id)
        message_id_int = int(message_id)
        
        # Try to remove from batch - if successful, no need to run deletion job
        if message_batcher.remove_message_from_batch(guild_id_int, channel_id_int, message_id_int):
            logger.info(f"Removed message {message_id} from batch instead of running deletion job")
            return
        
        # Message wasn't in batch, proceed with normal deletion job
        if not self.redis_client:
            logger.warning("Redis client not configured, cannot handle message deletion")
            return
        
        # Import here to avoid circular dependency
        from shared.redis.redis import MessageDeletionJob
        
        job = MessageDeletionJob(
            guild_id=guild_id,
            channel_id=channel_id,
            message_id=message_id
        )
        
        await self.redis_client.push_job(job.model_dump(mode='json'))
        
        logger.info(f"Queued deletion job for message {message_id}")


# Singleton instance
_scan_service: Optional[ScanService] = None


def get_scan_service(redis_client=None) -> ScanService:
    """Get or create the scan service singleton"""
    global _scan_service
    if _scan_service is None:
        _scan_service = ScanService(redis_client=redis_client)
    return _scan_service
