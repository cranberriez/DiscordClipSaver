"""
Message handler for processing Discord messages and extracting clips
"""
import logging
from typing import Optional
import discord
from shared.db.models import Message, Clip, Author
from shared.settings_resolver import get_channel_settings
from worker.thumbnail.thumbnail_handler import ThumbnailHandler
from worker.message.utils import compute_settings_hash
from worker.message.validators import should_process_message, filter_video_attachments
from worker.message.clip_metadata import extract_clip_info

logger = logging.getLogger(__name__)


class MessageHandler:
    """Handles individual message processing"""
    
    def __init__(self, thumbnail_handler: Optional[ThumbnailHandler] = None):
        """Initialize message handler with optional shared thumbnail handler"""
        self.thumbnail_handler = thumbnail_handler or ThumbnailHandler()
    
    async def process_message(
        self,
        discord_message: discord.Message,
        channel_id: str,
        guild_id: str
    ) -> int:
        """
        Process a Discord message, extract video attachments, generate thumbnails.

        Args:
            discord_message: Discord.py message object
            channel_id: Channel snowflake
            guild_id: Guild snowflake

        Returns:
            Number of clips found and processed
        """
        # Fetch settings
        settings = await get_channel_settings(guild_id, channel_id)
        
        # Validate message should be processed
        if not should_process_message(discord_message, settings):
            return 0
        
        # Upsert author and message
        await self._upsert_author(discord_message.author, guild_id)
        await self._upsert_message(discord_message, channel_id, guild_id, settings)
        
        # Process video attachments
        settings_hash = compute_settings_hash(settings)
        video_attachments = filter_video_attachments(
            discord_message.attachments,
            settings.allowed_mime_types
        )
        
        clips_processed = 0
        for attachment in video_attachments:
            success = await self._process_attachment(
                attachment,
                discord_message,
                channel_id,
                guild_id,
                settings_hash
            )
            if success:
                clips_processed += 1
        
        return clips_processed
    
    async def _upsert_author(self, author: discord.Member, guild_id: str) -> None:
        """Create or update an author record for a specific guild."""
        await Author.update_or_create(
            user_id=str(author.id),
            guild_id=guild_id,
            defaults={
                "username": author.name,
                "discriminator": author.discriminator or "0",
                "avatar_url": str(author.avatar.url) if author.avatar else None,
                "nickname": author.nick,
                "display_name": author.display_name,
                "guild_avatar_url": str(author.display_avatar.url) if author.display_avatar else None,
            }
        )
    
    async def _upsert_message(
        self,
        discord_message: discord.Message,
        channel_id: str,
        guild_id: str,
        settings
    ) -> None:
        """Create or update message record"""
        message_data = {
            "channel_id": channel_id,
            "guild_id": guild_id,
            "author_id": str(discord_message.author.id),
            "timestamp": discord_message.created_at,
            "content": (
                discord_message.content or ""
                if settings.enable_message_content_storage
                else ""
            )
        }
        
        await Message.update_or_create(
            id=str(discord_message.id),
            defaults=message_data
        )
    
    async def _process_attachment(
        self,
        attachment: discord.Attachment,
        discord_message: discord.Message,
        channel_id: str,
        guild_id: str,
        settings_hash: str
    ) -> bool:
        """
        Process single video attachment.
        
        Returns:
            True if clip was successfully processed
        """
        # Extract clip metadata
        clip_info = extract_clip_info(attachment, discord_message, channel_id)
        
        # Create or update clip record
        clip, created = await Clip.update_or_create(
            id=clip_info.clip_id,
            defaults={
                "message_id": clip_info.message_id,
                "channel_id": channel_id,
                "guild_id": guild_id,
                "filename": clip_info.filename,
                "file_size": clip_info.file_size,
                "mime_type": clip_info.mime_type,
                "cdn_url": clip_info.cdn_url,
                "expires_at": clip_info.expires_at,
                "thumbnail_status": "pending",
                "settings_hash": settings_hash
            }
        )
        
        # Check if thumbnail generation can be skipped
        if self._should_skip_thumbnail(clip, created, settings_hash):
            logger.debug(
                f"Clip {clip_info.clip_id} already processed with same settings, skipping"
            )
            return True
        
        # Generate thumbnails if needed
        if created or clip.thumbnail_status in ["failed", "pending"]:
            success = await self.thumbnail_handler.process_clip(clip)
            return success
        
        return True
    
    def _should_skip_thumbnail(self, clip: Clip, created: bool, settings_hash: str) -> bool:
        """Determine if thumbnail generation should be skipped"""
        return (
            not created and
            clip.settings_hash == settings_hash and
            clip.thumbnail_status == "completed"
        )
