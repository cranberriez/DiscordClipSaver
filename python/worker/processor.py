"""
Job processor for handling different job types
"""
import logging
from typing import Optional
import discord
from worker.discord.bot import WorkerBot
from worker.discord.get_message_history import get_message_history
from worker.discord.get_message import get_message
from worker.message.message_handler import MessageHandler
from worker.message.batch_processor import BatchMessageProcessor
from worker.thumbnail.thumbnail_handler import ThumbnailHandler
from worker.purge.purge_handler import PurgeHandler
from shared.db.models import Guild, Channel, ScanStatus, ChannelType
from shared.db.repositories.channel_scan_status import (
    get_or_create_scan_status,
    update_scan_status,
    increment_scan_counts
)
from shared.db.repositories.authors import get_author_ids_by_guild_id
from shared.redis.redis_client import RedisStreamClient
from shared.redis.redis import BatchScanJob

logger = logging.getLogger(__name__)


class JobProcessor:
    """Processes jobs from the Redis queue"""
    
    def __init__(self, bot: WorkerBot, redis_client: Optional[RedisStreamClient] = None):
        self.bot = bot
        
        # Create single shared thumbnail handler to avoid duplicate aiohttp sessions
        # Previously had 3 separate instances (one per handler) - wasteful!
        self.thumbnail_handler = ThumbnailHandler()
        
        # Inject shared handler into message processors
        self.message_handler = MessageHandler(thumbnail_handler=self.thumbnail_handler)
        self.batch_processor = BatchMessageProcessor(bot=bot, thumbnail_handler=self.thumbnail_handler)
        self.purge_handler = PurgeHandler(bot=bot)
        self.redis_client = redis_client
    
    async def close(self):
        """Close all handlers and cleanup resources"""
        # Close single shared thumbnail handler (contains aiohttp session)
        await self.thumbnail_handler.close()
        logger.debug("JobProcessor cleanup complete")
    
    async def _update_scan_status_with_error(
        self,
        guild_id: str,
        channel_id: str,
        status: ScanStatus,
        error_message: Optional[str] = None
    ) -> None:
        """
        Helper to update scan status and log appropriately.
        
        Args:
            guild_id: Guild snowflake
            channel_id: Channel snowflake
            status: New status
            error_message: Optional error message
        """
        await update_scan_status(
            guild_id=guild_id,
            channel_id=channel_id,
            status=status,
            error_message=error_message
        )
        
        if error_message:
            if status == ScanStatus.FAILED:
                logger.error(f"Scan failed for channel {channel_id}: {error_message}")
            else:
                logger.warning(f"Scan {status.value} for channel {channel_id}: {error_message}")
    
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
        
        # Check if channel type is scannable (not category, voice, etc.)
        if channel.type == ChannelType.CATEGORY:
            return False, "Cannot scan category channels"
        
        # This is fine, voice channels are supported
        # if channel.type == ChannelType.VOICE:
        #     return False, "Cannot scan voice channels"
        
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
        elif job_type == "message_deletion":
            await self.process_message_deletion(job_data)
        elif job_type == "purge_channel":
            await self.process_purge_channel(job_data)
        elif job_type == "purge_guild":
            await self.process_purge_guild(job_data)
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
        rescan = job_data.get("rescan", "stop")  # "stop", "continue", or "update"
        
        logger.info(f"Processing batch scan: channel={channel_id}, direction={direction}, limit={limit}, rescan={rescan}")
        
        try:
            # Get or create scan status
            scan_status = await get_or_create_scan_status(guild_id, channel_id)
            
            # Validate guild and channel scan enabled flags
            is_enabled, error_message = await self.validate_scan_enabled(guild_id, channel_id)
            
            if not is_enabled:
                await self._update_scan_status_with_error(
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
            try:
                discord_channel = await self.bot.fetch_channel(int(channel_id))
            except discord.Forbidden:
                await self._update_scan_status_with_error(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.FAILED,
                    error_message="Bot does not have permission to access this channel"
                )
                return
            except discord.NotFound:
                await self._update_scan_status_with_error(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.FAILED,
                    error_message="Channel not found or no longer exists"
                )
                return
            except discord.HTTPException as e:
                await self._update_scan_status_with_error(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.FAILED,
                    error_message=f"Discord API error: {str(e)}"
                )
                return
            
            # Validate channel type supports message history
            if not hasattr(discord_channel, 'history'):
                await self._update_scan_status_with_error(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.FAILED,
                    error_message=f"Channel type '{discord_channel.type}' does not support message scanning"
                )
                return
            
            # Fetch message history
            try:
                messages = await get_message_history(
                    channel=discord_channel,
                    limit=limit,
                    before_id=int(before_message_id) if before_message_id else None,
                    after_id=int(after_message_id) if after_message_id else None,
                    direction=direction
                )
            except discord.Forbidden:
                await self._update_scan_status_with_error(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.FAILED,
                    error_message="Bot does not have permission to read message history in this channel"
                )
                return
            except discord.HTTPException as e:
                await self._update_scan_status_with_error(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.FAILED,
                    error_message=f"Discord API error reading history: {str(e)}"
                )
                return
            
            logger.info(f"Fetched {len(messages)} messages from channel {channel_id}")
            
            # Handle existing messages based on rescan mode
            messages_to_process = messages
            stopped_on_duplicate = False

            # For update rescans, fetch existing authors to ensure they are updated
            existing_author_ids = set()
            if rescan == "update":
                logger.info(f"[UPDATE MODE] Fetching existing authors for guild {guild_id}")
                existing_author_ids = await get_author_ids_by_guild_id(guild_id)
                logger.info(f"Found {len(existing_author_ids)} existing authors")

            
            if messages:
                from shared.db.models import Message as MessageModel
                
                # Get message IDs
                message_ids = [str(msg.id) for msg in messages]
                
                # Check which messages already exist
                existing_messages = await MessageModel.filter(
                    id__in=message_ids,
                    channel_id=channel_id
                ).values_list('id', flat=True)
                
                existing_ids = set(existing_messages)
                
                if existing_ids:
                    logger.info(f"Found {len(existing_ids)} already-processed messages out of {len(messages)} (rescan mode: {rescan})")
                    
                    if rescan == "stop":
                        # Stop mode: Filter out existing messages and stop continuation
                        messages_to_process = [msg for msg in messages if str(msg.id) not in existing_ids]
                        if len(messages_to_process) < len(messages):
                            stopped_on_duplicate = True
                            logger.info(f"[STOP MODE] Stopping scan - encountered {len(existing_ids)} already-processed messages")
                    
                    elif rescan == "continue":
                        # Continue mode: Skip existing messages but keep scanning
                        messages_to_process = [msg for msg in messages if str(msg.id) not in existing_ids]
                        # Don't set stopped_on_duplicate - we want to continue scanning
                        logger.info(f"[CONTINUE MODE] Skipping {len(existing_ids)} already-processed messages, continuing scan")
                    
                    elif rescan == "update":
                        # Update mode: Process all messages, including existing ones
                        messages_to_process = messages
                        logger.info(f"[UPDATE MODE] Reprocessing all {len(messages)} messages including {len(existing_ids)} existing ones")
                    
                    else:
                        # Default to stop behavior for unknown modes
                        messages_to_process = [msg for msg in messages if str(msg.id) not in existing_ids]
                        if len(messages_to_process) < len(messages):
                            stopped_on_duplicate = True
                            logger.warning(f"Unknown rescan mode '{rescan}', defaulting to STOP behavior")
            
            # Process messages in batch for better performance
            total_clips, thumbnails_generated = await self.batch_processor.process_messages_batch(
                messages=messages_to_process,
                channel_id=channel_id,
                guild_id=guild_id,
                existing_author_ids=existing_author_ids,
                is_update_scan=(rescan == "update")
            )
            
            # Update scan counts
            await increment_scan_counts(
                guild_id=guild_id,
                channel_id=channel_id,
                messages_scanned=len(messages_to_process),
                clips_found=total_clips
            )
            
            # Track message IDs for continuation
            continuation_needed = False
            if messages:
                # Check if this is the first scan (both IDs are null)
                is_first_scan = (
                    scan_status.forward_message_id is None and 
                    scan_status.backward_message_id is None
                )
                
                if direction == "backward":
                    # Oldest message is the last in the list
                    oldest_message_id = str(messages[-1].id)
                    newest_message_id = str(messages[0].id)
                    
                    if is_first_scan:
                        # First scan: set BOTH boundaries
                        await update_scan_status(
                            guild_id=guild_id,
                            channel_id=channel_id,
                            backward_message_id=oldest_message_id,
                            forward_message_id=newest_message_id
                        )
                    else:
                        # Continuation: only update backward boundary
                        await update_scan_status(
                            guild_id=guild_id,
                            channel_id=channel_id,
                            backward_message_id=oldest_message_id
                        )
                    # Continue if we got a full batch AND didn't hit duplicates
                    continuation_needed = len(messages) >= limit and not stopped_on_duplicate
                    
                elif direction == "forward":
                    # Newest message is the last in the list
                    newest_message_id = str(messages[-1].id)
                    oldest_message_id = str(messages[0].id)
                    
                    if is_first_scan:
                        # First scan: set BOTH boundaries
                        await update_scan_status(
                            guild_id=guild_id,
                            channel_id=channel_id,
                            forward_message_id=newest_message_id,
                            backward_message_id=oldest_message_id
                        )
                    else:
                        # Continuation: only update forward boundary
                        await update_scan_status(
                            guild_id=guild_id,
                            channel_id=channel_id,
                            forward_message_id=newest_message_id
                        )
                    # Continue if we got a full batch AND didn't hit duplicates
                    continuation_needed = len(messages) >= limit and not stopped_on_duplicate
            
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
                    auto_continue=True,  # Preserve auto_continue for continuation jobs
                    rescan=rescan  # Preserve rescan flag
                )
                
                await self.redis_client.push_job(continuation_job.model_dump(mode='json'))
                
                # Keep status as RUNNING since continuation is queued
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.RUNNING,
                    error_message=None
                )
            else:
                # No more messages, auto_continue disabled, or no continuation needed - mark as succeeded
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.SUCCEEDED,
                    error_message=None
                )
                
                if not auto_continue and continuation_needed:
                    logger.info(f"Batch scan complete but auto_continue=False, not queueing continuation")
                elif stopped_on_duplicate:
                    logger.info(f"Batch scan stopped - reached already-scanned messages (rescan mode: {rescan})")
            
            logger.info(f"Batch scan complete: processed {len(messages_to_process)} messages (of {len(messages)} fetched), found {total_clips} clips, rescan mode: {rescan}")
            
        except Exception as e:
            logger.error(f"Batch scan failed for channel {channel_id}: {e}", exc_info=True)
            
            # Update status to failed
            await self._update_scan_status_with_error(
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
                        guild_id=guild_id
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
            job_data: ThumbnailRetryJob data with optional clip_ids for targeted retry
        """
        clip_ids = job_data.get('clip_ids')
        
        if clip_ids:
            logger.info(f"Processing thumbnail retry job for {len(clip_ids)} specific clip(s)")
        else:
            logger.info("Processing thumbnail retry job (all eligible clips)")
        
        try:
            # Pass clip_ids to handler for targeted retry
            success_count = await self.thumbnail_handler.retry_failed_thumbnails(clip_ids=clip_ids)
            logger.info(f"Thumbnail retry complete: {success_count} thumbnails successfully generated")
        except Exception as e:
            logger.error(f"Thumbnail retry job failed: {e}", exc_info=True)
            raise
    
    async def process_message_deletion(self, job_data: dict):
        """
        Process message deletion job - hard delete message, clips, and thumbnails.
        
        This handles Discord message deletions by:
        1. Checking if message exists in database (is it a clip message?)
        2. Deleting thumbnail files from storage
        3. Hard deleting thumbnails from database
        4. Hard deleting clips from database
        5. Hard deleting message from database
        
        Note: deleted_at is for interface archival, not Discord deletions.
        Discord deletions are permanent (CDN URLs are lost), so we fully remove them.
        
        Args:
            job_data: MessageDeletionJob data
        """
        from shared.db.models import Message, Clip, Thumbnail
        from shared.storage import get_storage_backend
        
        message_id = job_data["message_id"]
        channel_id = job_data["channel_id"]
        guild_id = job_data["guild_id"]
        
        logger.info(f"Processing message deletion: message={message_id}, channel={channel_id}")
        
        try:
            # Check if message exists in database
            message = await Message.get_or_none(id=message_id).prefetch_related("clips")
            
            if not message:
                logger.debug(f"Message {message_id} not in database (not a clip message), skipping")
                return
            
            # Get all clips associated with this message
            clips = await Clip.filter(message_id=message_id).prefetch_related("thumbnails")
            
            if not clips:
                logger.debug(f"Message {message_id} has no clips, deleting message only")
                await message.delete()
                return
            
            logger.info(f"Message {message_id} has {len(clips)} clip(s), deleting all associated data")
            
            storage = get_storage_backend()
            total_thumbnails_deleted = 0
            total_files_deleted = 0
            
            # Process each clip
            for clip in clips:
                # Get all thumbnails for this clip
                thumbnails = await Thumbnail.filter(clip_id=clip.id).all()
                
                # Delete thumbnail files from storage
                for thumbnail in thumbnails:
                    try:
                        await storage.delete(thumbnail.storage_path)
                        total_files_deleted += 1
                        logger.debug(f"Deleted thumbnail file: {thumbnail.storage_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete thumbnail file {thumbnail.storage_path}: {e}")
                        # Continue even if file deletion fails (file might already be gone)
                
                # Hard delete thumbnails from database
                deleted_thumbs = await Thumbnail.filter(clip_id=clip.id).delete()
                total_thumbnails_deleted += deleted_thumbs
                
                # Hard delete clip from database
                await clip.delete()
                logger.debug(f"Deleted clip {clip.id} and {deleted_thumbs} thumbnail(s)")
            
            # Finally, hard delete the message
            await message.delete()
            
            logger.info(
                f"Message deletion complete: message={message_id}, "
                f"clips={len(clips)}, thumbnails={total_thumbnails_deleted}, "
                f"files={total_files_deleted}"
            )
            
        except Exception as e:
            logger.error(f"Message deletion failed for {message_id}: {e}", exc_info=True)
            raise
    
    async def process_purge_channel(self, job_data: dict):
        """
        Process channel purge job - delete all clips and data for a channel.
        
        Args:
            job_data: PurgeChannelJob data
        """
        channel_id = job_data["channel_id"]
        guild_id = job_data["guild_id"]
        
        logger.info(f"Processing channel purge: guild={guild_id}, channel={channel_id}")
        
        try:
            # Stop any active scans for this channel
            await self._stop_channel_scan(guild_id, channel_id)
            
            # Execute purge
            stats = await self.purge_handler.purge_channel(
                guild_id=guild_id,
                channel_id=channel_id
            )
            
            logger.info(f"Channel purge complete: {stats}")
            
        except Exception as e:
            logger.error(f"Channel purge failed for {channel_id}: {e}", exc_info=True)
            raise
    
    async def process_purge_guild(self, job_data: dict):
        """
        Process guild purge job - delete all data for guild and leave it.
        
        Args:
            job_data: PurgeGuildJob data
        """
        guild_id = job_data["guild_id"]
        
        logger.info(f"Processing guild purge: guild={guild_id}")
        
        try:
            # Stop all active scans for this guild
            await self._stop_guild_scans(guild_id)
            
            # Execute purge (will also leave the guild)
            stats = await self.purge_handler.purge_guild(guild_id=guild_id)
            
            logger.info(f"Guild purge complete: {stats}")
            
        except Exception as e:
            logger.error(f"Guild purge failed for {guild_id}: {e}", exc_info=True)
            raise
    
    async def _stop_channel_scan(self, guild_id: str, channel_id: str):
        """
        Stop any active scan for a channel by setting status to CANCELLED.
        
        Args:
            guild_id: Guild snowflake
            channel_id: Channel snowflake
        """
        try:
            scan_status = await get_or_create_scan_status(guild_id, channel_id)
            
            if scan_status.status == ScanStatus.RUNNING:
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    status=ScanStatus.CANCELLED,
                    error_message="Scan stopped due to channel purge"
                )
                logger.info(f"Stopped active scan for channel {channel_id}")
        except Exception as e:
            logger.warning(f"Failed to stop scan for channel {channel_id}: {e}")
            # Don't raise - purge should continue even if scan stop fails
    
    async def _stop_guild_scans(self, guild_id: str):
        """
        Stop all active scans for a guild by setting statuses to CANCELLED.
        
        Args:
            guild_id: Guild snowflake
        """
        try:
            from shared.db.models import ChannelScanStatus
            
            # Get all running scans for this guild
            running_scans = await ChannelScanStatus.filter(
                guild_id=guild_id,
                status=ScanStatus.RUNNING
            ).all()
            
            for scan in running_scans:
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=scan.channel_id,
                    status=ScanStatus.CANCELLED,
                    error_message="Scan stopped due to guild purge"
                )
            
            if running_scans:
                logger.info(f"Stopped {len(running_scans)} active scans for guild {guild_id}")
                
        except Exception as e:
            logger.warning(f"Failed to stop scans for guild {guild_id}: {e}")
            # Don't raise - purge should continue even if scan stop fails