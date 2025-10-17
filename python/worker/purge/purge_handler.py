"""
Purge handler for deleting clips, messages, and thumbnails
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from worker.discord.bot import WorkerBot
from shared.db.models import Guild, Channel, Message, Clip, Thumbnail, ChannelScanStatus
from shared.storage import get_storage_backend

logger = logging.getLogger(__name__)


class PurgeHandler:
    """Handles purge operations for channels and guilds"""
    
    def __init__(self, bot: WorkerBot):
        self.bot = bot
        self.storage = get_storage_backend()
    
    async def purge_channel(
        self,
        guild_id: str,
        channel_id: str
    ) -> dict:
        """
        Purge all clips and data for a specific channel.
        Sets purge cooldown to prevent rapid re-purging.
        
        Args:
            guild_id: Guild snowflake
            channel_id: Channel snowflake
            
        Returns:
            Dict with purge statistics
        """
        logger.info(f"Starting channel purge: guild={guild_id}, channel={channel_id}")
        
        stats = {
            "messages_deleted": 0,
            "clips_deleted": 0,
            "thumbnails_deleted": 0,
            "files_deleted": 0,
            "scan_status_deleted": 0,
        }
        
        try:
            # Get all clips for this channel
            clips = await Clip.filter(
                guild_id=guild_id,
                channel_id=channel_id
            ).all()
            
            logger.info(f"Found {len(clips)} clips to purge for channel {channel_id}")
            
            # Delete thumbnails and files for each clip
            for clip in clips:
                # Get thumbnails
                thumbnails = await Thumbnail.filter(clip_id=clip.id).all()
                
                # Delete thumbnail files from storage
                for thumbnail in thumbnails:
                    try:
                        await self.storage.delete(thumbnail.storage_path)
                        stats["files_deleted"] += 1
                        logger.debug(f"Deleted thumbnail file: {thumbnail.storage_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete thumbnail file {thumbnail.storage_path}: {e}")
                        # Continue even if file deletion fails
                
                # Hard delete thumbnails from database
                deleted_thumbs = await Thumbnail.filter(clip_id=clip.id).delete()
                stats["thumbnails_deleted"] += deleted_thumbs
            
            # Hard delete all clips for this channel
            deleted_clips = await Clip.filter(
                guild_id=guild_id,
                channel_id=channel_id
            ).delete()
            stats["clips_deleted"] = deleted_clips
            
            # Hard delete all messages for this channel
            deleted_messages = await Message.filter(
                guild_id=guild_id,
                channel_id=channel_id
            ).delete()
            stats["messages_deleted"] = deleted_messages
            
            # Delete channel scan status (scan metadata is now invalid)
            deleted_scan_status = await ChannelScanStatus.filter(
                guild_id=guild_id,
                channel_id=channel_id
            ).delete()
            stats["scan_status_deleted"] = deleted_scan_status
            if deleted_scan_status > 0:
                logger.info(f"Deleted scan status for channel {channel_id}")
            
            # Set purge cooldown on channel
            cooldown_minutes = float(os.getenv("PURGE_COOLDOWN_MINUTES", "5"))
            channel = await Channel.get_or_none(id=channel_id)
            if channel and cooldown_minutes > 0:
                channel.purge_cooldown = datetime.now(timezone.utc) + timedelta(minutes=cooldown_minutes)
                await channel.save()
                logger.info(f"Set purge cooldown for channel {channel_id} until {channel.purge_cooldown}")
            elif channel:
                # Clear cooldown if disabled (<=0)
                channel.purge_cooldown = None
                await channel.save()
                logger.info(f"Purge cooldown disabled for channel {channel_id}")
            
            logger.info(
                f"Channel purge complete: channel={channel_id}, "
                f"messages={stats['messages_deleted']}, "
                f"clips={stats['clips_deleted']}, "
                f"thumbnails={stats['thumbnails_deleted']}, "
                f"files={stats['files_deleted']}, "
                f"scan_status={stats['scan_status_deleted']}"
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Channel purge failed for {channel_id}: {e}", exc_info=True)
            raise
    
    async def purge_guild(
        self,
        guild_id: str
    ) -> dict:
        """
        Purge all data for a guild and leave it.
        
        Args:
            guild_id: Guild snowflake
            
        Returns:
            Dict with purge statistics
        """
        logger.info(f"Starting guild purge: guild={guild_id}")
        
        stats = {
            "channels_purged": 0,
            "messages_deleted": 0,
            "clips_deleted": 0,
            "thumbnails_deleted": 0,
            "files_deleted": 0,
            "scan_status_deleted": 0,
            "guild_left": False,
        }
        
        try:
            # Get all clips for this guild
            clips = await Clip.filter(guild_id=guild_id).all()
            
            logger.info(f"Found {len(clips)} clips to purge for guild {guild_id}")
            
            # Delete thumbnails and files for each clip
            for clip in clips:
                # Get thumbnails
                thumbnails = await Thumbnail.filter(clip_id=clip.id).all()
                
                # Delete thumbnail files from storage
                for thumbnail in thumbnails:
                    try:
                        await self.storage.delete(thumbnail.storage_path)
                        stats["files_deleted"] += 1
                        logger.debug(f"Deleted thumbnail file: {thumbnail.storage_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete thumbnail file {thumbnail.storage_path}: {e}")
                        # Continue even if file deletion fails
                
                # Hard delete thumbnails from database
                deleted_thumbs = await Thumbnail.filter(clip_id=clip.id).delete()
                stats["thumbnails_deleted"] += deleted_thumbs
            
            # Hard delete all clips for this guild
            deleted_clips = await Clip.filter(guild_id=guild_id).delete()
            stats["clips_deleted"] = deleted_clips
            
            # Hard delete all messages for this guild
            deleted_messages = await Message.filter(guild_id=guild_id).delete()
            stats["messages_deleted"] = deleted_messages
            
            # Delete all channel scan statuses for this guild (scan metadata is now invalid)
            deleted_scan_statuses = await ChannelScanStatus.filter(guild_id=guild_id).delete()
            stats["scan_status_deleted"] = deleted_scan_statuses
            logger.info(f"Deleted {deleted_scan_statuses} scan status(es) for guild {guild_id}")
            
            # Hard delete all channels for this guild
            deleted_channels = await Channel.filter(guild_id=guild_id).delete()
            stats["channels_purged"] = deleted_channels
            logger.info(f"Deleted {deleted_channels} channel(s) for guild {guild_id}")
            
            # Soft delete guild (set deleted_at)
            guild = await Guild.get_or_none(id=guild_id)
            if guild:
                guild.deleted_at = datetime.now(timezone.utc)
                await guild.save()
                logger.info(f"Soft deleted guild {guild_id}")
            
            # Leave the guild via bot
            try:
                client = self.bot.get_client()
                discord_guild = client.get_guild(int(guild_id))
                if discord_guild:
                    await discord_guild.leave()
                    stats["guild_left"] = True
                    logger.info(f"Bot left guild {guild_id}")
                else:
                    logger.warning(f"Guild {guild_id} not found in bot cache (already left?)")
            except Exception as e:
                logger.error(f"Failed to leave guild {guild_id}: {e}")
                # Continue even if leaving fails
            
            logger.info(
                f"Guild purge complete: guild={guild_id}, "
                f"channels={stats['channels_purged']}, "
                f"messages={stats['messages_deleted']}, "
                f"clips={stats['clips_deleted']}, "
                f"thumbnails={stats['thumbnails_deleted']}, "
                f"files={stats['files_deleted']}, "
                f"scan_status={stats['scan_status_deleted']}, "
                f"guild_left={stats['guild_left']}"
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Guild purge failed for {guild_id}: {e}", exc_info=True)
            raise
