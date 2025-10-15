"""
Message handler for processing Discord messages and extracting clips
"""
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from shared.db.models import Message, Clip, FailedThumbnail
from shared.settings_resolver import get_channel_settings, ResolvedSettings
import discord
import logging

logger = logging.getLogger(__name__)


class MessageHandler:
    async def process_message(
        self,
        discord_message: discord.Message,
        channel_id: str,
        guild_id: str,
        thumbnail_generator
    ) -> int:
        """
        Process a Discord message, extract video attachments, generate thumbnails.

        Settings are fetched from the database using guild_id and channel_id.

        Args:
            discord_message: Discord.py message object
            channel_id: Channel snowflake
            guild_id: Guild snowflake
            thumbnail_generator: Thumbnail generator instance

        Returns:
            Number of clips found and processed
        """
        # Fetch settings from database
        settings = await get_channel_settings(guild_id, channel_id)
        if not discord_message.attachments:
            return 0
        
        # Apply regex filter to message content if configured
        if settings.match_regex and discord_message.content:
            import re
            if not re.search(settings.match_regex, discord_message.content):
                logger.debug(f"Message {discord_message.id} doesn't match regex, skipping")
                return 0
        
        # Filter video attachments based on allowed MIME types
        video_attachments = [
            att for att in discord_message.attachments
            if att.content_type and att.content_type in settings.allowed_mime_types
        ]
        
        if not video_attachments:
            return 0
        
        # Create or update message record
        message_data = {
            "channel_id": channel_id,
            "guild_id": guild_id,
            "author_id": str(discord_message.author.id),
            "timestamp": discord_message.created_at
        }
        
        # Only store content if enabled in settings
        if settings.enable_message_content_storage:
            message_data["content"] = discord_message.content or ""
        else:
            message_data["content"] = ""
        
        await Message.update_or_create(
            id=str(discord_message.id),
            defaults=message_data
        )
        
        # Compute settings hash once for all clips in this message
        settings_hash = hashlib.md5(
            json.dumps(settings.to_dict(), sort_keys=True).encode()
        ).hexdigest()
        
        # Process each video attachment
        clips_processed = 0
        for attachment in video_attachments:
            success = await self._process_attachment(
                attachment,
                discord_message,
                channel_id,
                guild_id,
                settings_hash,
                thumbnail_generator
            )
            if success:
                clips_processed += 1
        
        return clips_processed
    
    async def _process_attachment(
        self,
        attachment: discord.Attachment,
        discord_message: discord.Message,
        channel_id: str,
        guild_id: str,
        settings_hash: str,
        thumbnail_generator
    ) -> bool:
        """
        Process single video attachment.
        
        Returns:
            True if clip was successfully processed
        """
        # Generate clip ID (hash of message_id + channel_id + filename + timestamp)
        clip_id = self._generate_clip_id(
            str(discord_message.id),
            channel_id,
            attachment.filename,
            discord_message.created_at
        )
        
        # Extract expiry from CDN URL
        expires_at = self._extract_cdn_expiry(attachment.url)
        
        # Create or update clip record
        clip, created = await Clip.update_or_create(
            id=clip_id,
            defaults={
                "message_id": str(discord_message.id),
                "channel_id": channel_id,
                "guild_id": guild_id,
                "filename": attachment.filename,
                "file_size": attachment.size,
                "mime_type": attachment.content_type,
                "cdn_url": attachment.url,
                "expires_at": expires_at,
                "thumbnail_status": "pending",
                "settings_hash": settings_hash  # Store settings hash
            }
        )
        
        # If clip already exists with same settings hash, skip thumbnail generation
        if not created and clip.settings_hash == settings_hash and clip.thumbnail_status == "completed":
            logger.debug(f"Clip {clip_id} already processed with same settings, skipping")
            return True
        
        # Generate thumbnail
        if created or clip.thumbnail_status in ["failed", "pending"]:
            try:
                await clip.update_from_dict({"thumbnail_status": "processing"}).save()
                await thumbnail_generator.generate_for_clip(clip)
                await clip.update_from_dict({"thumbnail_status": "completed"}).save()
                logger.info(f"Thumbnail generated for clip {clip_id}")
                return True
            except Exception as e:
                logger.error(f"Thumbnail generation failed for clip {clip_id}: {e}")
                await clip.update_from_dict({"thumbnail_status": "failed"}).save()
                
                # Log to failed_thumbnails table
                await FailedThumbnail.create(
                    id=str(uuid.uuid4()),
                    clip_id=clip_id,
                    error_message=str(e),
                    next_retry_at=datetime.now(timezone.utc) + timedelta(minutes=5)
                )
                return False
        
        return True
    
    @staticmethod
    def _generate_clip_id(message_id: str, channel_id: str, filename: str, timestamp: datetime) -> str:
        """Generate unique clip ID from message data"""
        data = f"{message_id}:{channel_id}:{filename}:{timestamp.isoformat()}"
        return hashlib.md5(data.encode()).hexdigest()
    
    @staticmethod
    def _extract_cdn_expiry(cdn_url: str) -> datetime:
        """Extract expiry timestamp from Discord CDN URL"""
        # Discord CDN URLs contain 'ex=' parameter with unix timestamp
        import urllib.parse
        parsed = urllib.parse.urlparse(cdn_url)
        params = urllib.parse.parse_qs(parsed.query)
        
        if 'ex' in params:
            try:
                timestamp = int(params['ex'][0], 16)  # Hex timestamp
                return datetime.fromtimestamp(timestamp)
            except (ValueError, OverflowError):
                pass
        
        # Default: 24 hours from now
        return datetime.utcnow() + timedelta(hours=24)