"""
Tortoise ORM Models for Discord Clip Scraper
"""
from tortoise import fields, Model
from tortoise.contrib.postgres.fields import ArrayField
from datetime import datetime
from enum import Enum


class ScanStatus(str, Enum):
    """Status of message scanning for a channel"""
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ChannelType(str, Enum):
    """Discord channel types"""
    TEXT = "text"
    VOICE = "voice"
    CATEGORY = "category"
    FORUM = "forum"


class User(Model):
    """Discord user who owns/manages the bot setup"""
    id = fields.TextField(pk=True)  # Discord user snowflake
    username = fields.CharField(max_length=32)
    discriminator = fields.CharField(max_length=4)
    avatar_url = fields.TextField(null=True)
    # Note: OAuth tokens are NOT stored here. NextAuth manages session securely.
    # The bot acts as itself (via bot token), not on behalf of users.
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Guild(Model):
    """Discord guild (server)"""
    id = fields.TextField(pk=True)  # Discord guild snowflake
    owner = fields.ForeignKeyField("models.User", related_name="owned_guilds")
    name = fields.CharField(max_length=100)
    icon_url = fields.TextField(null=True)
    message_scan_enabled = fields.BooleanField(default=True)  # Master toggle for message scanning
    last_message_scan_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class GuildSettings(Model):
    """Guild-level settings configuration (JSON store)"""
    id = fields.IntField(pk=True)
    guild = fields.OneToOneField("models.Guild", related_name="settings")
    # Default settings applied to all channels unless overridden
    default_channel_settings = fields.JSONField(null=True)
    # Guild-level settings (expandable for future features)
    settings = fields.JSONField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Channel(Model):
    """Discord channel"""
    id = fields.TextField(pk=True)  # Discord channel snowflake
    guild = fields.ForeignKeyField("models.Guild", related_name="channels")
    name = fields.CharField(max_length=100)
    type = fields.CharEnumField(ChannelType, default=ChannelType.TEXT)
    position = fields.IntField(default=0)
    parent_id = fields.TextField(null=True)  # Parent category ID if nested
    topic = fields.TextField(null=True)
    nsfw = fields.BooleanField(default=False)  # Whether channel is marked NSFW
    message_scan_enabled = fields.BooleanField(default=True)  # Override for guild default
    last_channel_sync_at = fields.DatetimeField(null=True)
    next_allowed_channel_sync_at = fields.DatetimeField(null=True)
    channel_sync_cooldown_level = fields.IntField(default=0)
    deleted_at = fields.DatetimeField(null=True)  # Soft delete
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class ChannelSettings(Model):
    """Channel-level settings configuration (JSON store) - Row optional, only if overrides exist"""
    id = fields.IntField(pk=True)
    channel = fields.OneToOneField("models.Channel", related_name="settings")
    # Override settings (null means use guild defaults)
    settings = fields.JSONField(
        null=True,
        default=None
    )
    # Example structure if overrides exist:
    # {
    #     "allowed_mime_types": ["video/mp4"],
    #     "match_regex": "clip.*",
    #     "scan_mode": "bidirectional"
    # }
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class ChannelScanStatus(Model):
    """Tracks message scanning progress for a channel"""
    id = fields.IntField(pk=True)
    channel = fields.OneToOneField("models.Channel", related_name="scan_status")
    status = fields.CharEnumField(ScanStatus, default=ScanStatus.QUEUED)
    # Message ID tracking for bidirectional scanning
    forward_message_id = fields.TextField(null=True)  # Most recent scanned going forward
    backward_message_id = fields.TextField(null=True)  # Oldest scanned going backward
    # Scanning progress
    message_count = fields.IntField(default=0)  # Count of messages with clips
    total_messages_scanned = fields.IntField(default=0)  # Total messages examined
    error_message = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Message(Model):
    """Discord message containing video attachments"""
    id = fields.TextField(pk=True)  # Discord message snowflake
    channel = fields.ForeignKeyField("models.Channel", related_name="messages")
    guild = fields.ForeignKeyField("models.Guild", related_name="messages")
    author_id = fields.TextField()  # Discord user snowflake
    content = fields.TextField(null=True)
    timestamp = fields.DatetimeField()  # Discord message timestamp
    deleted_at = fields.DatetimeField(null=True)  # Soft delete when message removed from Discord
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Clip(Model):
    """Individual video attachment extracted from a message"""
    id = fields.TextField(pk=True)  # Generated hash: md5(message_id + channel_id + filename + timestamp)
    message = fields.ForeignKeyField("models.Message", related_name="clips")
    channel = fields.ForeignKeyField("models.Channel", related_name="clips")
    guild = fields.ForeignKeyField("models.Guild", related_name="clips")
    filename = fields.CharField(max_length=255)
    file_size = fields.BigIntField()  # Bytes
    mime_type = fields.CharField(max_length=50)
    duration = fields.FloatField(null=True)  # Seconds (if extracted)
    resolution = fields.CharField(max_length=20, null=True)  # e.g., "1920x1080"
    # Discord CDN URL (expires after ~24 hours)
    cdn_url = fields.TextField()
    expires_at = fields.DatetimeField()  # When CDN URL expires
    # Processing status
    thumbnail_status = fields.CharField(
        max_length=20,
        default="pending"
    )  # pending, processing, completed, failed
    deleted_at = fields.DatetimeField(null=True)  # Soft delete when message removed
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Thumbnail(Model):
    """Generated thumbnail for a clip"""
    id = fields.TextField(pk=True)  # UUID
    clip = fields.OneToOneField("models.Clip", related_name="thumbnail")
    storage_path = fields.TextField()  # Local path or cloud bucket path
    width = fields.IntField()
    height = fields.IntField()
    file_size = fields.BigIntField()  # Bytes
    mime_type = fields.CharField(max_length=20, default="image/webp")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class FailedThumbnail(Model):
    """Track failed thumbnail generation for retry logic"""
    id = fields.TextField(pk=True)  # UUID
    clip = fields.ForeignKeyField("models.Clip", related_name="failed_thumbnails")
    error_message = fields.TextField()
    retry_count = fields.IntField(default=0)
    last_attempted_at = fields.DatetimeField(null=True)
    next_retry_at = fields.DatetimeField()  # When to next attempt
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class InstallIntent(Model):
    """Short-lived OAuth state for bot installation"""
    id = fields.TextField(pk=True)  # State parameter value
    user_id = fields.TextField()  # Discord user snowflake
    guild_id = fields.TextField(null=True)  # Target guild if known
    state = fields.TextField()  # OAuth state for verification
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)


# Optional: Job tracking table for monitoring and debugging
class Job(Model):
    """Track queued and processed jobs for monitoring"""
    id = fields.TextField(pk=True)  # UUID from Redis job
    type = fields.CharField(max_length=50)  # batch, message, rescan, thumbnail_retry
    guild_id = fields.TextField()
    channel_id = fields.TextField()
    status = fields.CharField(
        max_length=20,
        default="pending"
    )  # pending, processing, completed, failed
    result = fields.JSONField(null=True)  # Result from worker
    error = fields.TextField(null=True)
    claimed_by_worker = fields.TextField(null=True)  # Worker identifier
    claimed_at = fields.DatetimeField(null=True)
    completed_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)