"""
Tortoise ORM Models for Discord Clip Scraper
"""
from tortoise import fields, Model
from tortoise.contrib.postgres.fields import ArrayField
from datetime import datetime
from enum import Enum


class ScanStatus(str, Enum):
    """Status of message scanning for a channel"""
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ChannelType(str, Enum):
    """Discord channel types"""
    TEXT = "text"
    VOICE = "voice"
    CATEGORY = "category"
    FORUM = "forum"


class Visibility(str, Enum):
    """Visibility of a clip"""
    PUBLIC = "PUBLIC"
    UNLISTED = "UNLISTED"
    PRIVATE = "PRIVATE"


class User(Model):
    """Discord user model, represents the discord.User object mainly used for login/authentication"""
    id = fields.CharField(max_length=64, indexable=True, pk=True, unique=True)  # Discord user snowflake
    username = fields.CharField(max_length=32) # Discord NAME field
    discriminator = fields.CharField(max_length=4) # Discord DISCRIMINATOR field
    avatar_url = fields.TextField(null=True) # Discord AVATAR field
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table="user"

class Author(Model):
    """Represents a user's state within a specific guild (a Discord Member)."""
    user_id = fields.CharField(max_length=64, indexable=True) # Discord user snowflake
    guild = fields.ForeignKeyField("models.Guild", related_name="authors", on_delete=fields.CASCADE)
    username = fields.CharField(max_length=32) # The user's global username
    discriminator = fields.CharField(max_length=4) # Discord DISCRIMINATOR field
    avatar_url = fields.TextField(null=True) # The user's global avatar
    nickname = fields.CharField(max_length=32, null=True)  # Guild-specific nickname
    display_name = fields.CharField(max_length=32, null=True) # Guild-specific display name
    guild_avatar_url = fields.TextField(null=True) # Guild-specific avatar
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "author"
        unique_together = ("user_id", "guild")


class Guild(Model):
    """Discord guild (server)"""
    id = fields.CharField(max_length=64, indexable=True, pk=True, unique=True)  # Discord guild snowflake
    owner = fields.ForeignKeyField("models.User", related_name="owned_guilds", null=True)
    name = fields.CharField(max_length=100)
    icon_url = fields.TextField(null=True)
    message_scan_enabled = fields.BooleanField(default=False)  # Master toggle for message scanning
    last_message_scan_at = fields.DatetimeField(null=True)
    purge_cooldown = fields.DatetimeField(null=True)  # Prevent abuse of purge operations
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    deleted_at = fields.DatetimeField(null=True)

    class Meta:
        table="guild"


class GuildSettings(Model):
    """Guild-level settings configuration (JSON store)"""
    id = fields.IntField(auto_increment=True, pk=True)
    guild = fields.OneToOneField("models.Guild", related_name="settings", indexable=True)
    # Default settings applied to all channels unless overridden
    default_channel_settings = fields.JSONField(null=True)
    # Guild-level settings (expandable for future features)
    settings = fields.JSONField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    deleted_at = fields.DatetimeField(null=True)

    class Meta:
        table="guild_settings"


class Channel(Model):
    """Discord channel"""
    id = fields.CharField(max_length=64, indexable=True, pk=True)  # Discord channel snowflake
    guild = fields.ForeignKeyField("models.Guild", related_name="channels", indexable=True)
    name = fields.CharField(max_length=100)
    type = fields.CharEnumField(ChannelType, default=ChannelType.TEXT)
    position = fields.IntField(default=0)
    parent_id = fields.CharField(max_length=64, null=True)  # Parent category ID if nested
    topic = fields.TextField(null=True)
    nsfw = fields.BooleanField(default=False)  # Whether channel is marked NSFW
    message_scan_enabled = fields.BooleanField(default=False)  # Override for guild default
    last_channel_sync_at = fields.DatetimeField(null=True)
    next_allowed_channel_sync_at = fields.DatetimeField(null=True)
    channel_sync_cooldown_level = fields.IntField(default=0)
    purge_cooldown = fields.DatetimeField(null=True)  # Prevent abuse of purge operations
    deleted_at = fields.DatetimeField(null=True)  # Soft delete
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        unique_together=("guild", "id")
        table="channel"
        indexes=[
            ("guild_id", "message_scan_enabled"),  # Channel queries by guild filtered by scan status
        ]


class ChannelSettings(Model):
    """Channel-level settings configuration (JSON store) - Row optional, only if overrides exist"""
    id = fields.IntField(auto_increment=True, pk=True)
    channel = fields.OneToOneField("models.Channel", related_name="settings", indexable=True)
    # Override settings (null means use guild defaults)
    settings = fields.JSONField(
        null=True,
        default=None
    )
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    deleted_at = fields.DatetimeField(null=True)

    class Meta:
        table="channel_settings"


class ChannelScanStatus(Model):
    """Tracks message scanning progress for a channel"""
    id = fields.IntField(auto_increment=True, pk=True)
    guild = fields.ForeignKeyField("models.Guild", related_name="scan_status", indexable=True)
    channel = fields.OneToOneField("models.Channel", related_name="scan_status", indexable=True)
    status = fields.CharEnumField(ScanStatus, default=ScanStatus.QUEUED)
    # Message ID tracking for bidirectional scanning
    forward_message_id = fields.CharField(max_length=64, null=True)  # Most recent scanned going forward
    backward_message_id = fields.CharField(max_length=64, null=True)  # Oldest scanned going backward
    # Scanning progress
    message_count = fields.IntField(default=0)  # Count of messages with clips
    total_messages_scanned = fields.IntField(default=0)  # Total messages examined
    error_message = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        unique_together=("guild", "channel")
        table="channel_scan_status"
        indexes=[
            ("channel_id",),                # Scan status lookup by channel (very common)
            ("guild_id", "status"),         # Scan monitoring by guild and status
        ]


class Message(Model):
    """Discord message containing video attachments"""
    id = fields.CharField(max_length=64, indexable=True, pk=True)  # Discord message snowflake
    guild = fields.ForeignKeyField("models.Guild", related_name="messages", indexable=True)
    channel = fields.ForeignKeyField("models.Channel", related_name="messages", indexable=True)
    author_id = fields.CharField(max_length=64, indexable=True) # Message author's user snowflake
    content = fields.TextField(null=True)
    timestamp = fields.DatetimeField()  # Discord message timestamp
    deleted_at = fields.DatetimeField(null=True)  # Soft delete when message removed from Discord
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        unique_together=("guild", "channel", "id")
        table="message"
        indexes=[
            ("channel_id", "timestamp"),  # Message queries by channel ordered by timestamp
            ("guild_id", "channel_id"),   # Message queries filtered by guild and channel
        ]

class Clip(Model):
    """Individual video attachment extracted from a message"""
    id = fields.CharField(max_length=64, pk=True)  # Generated hash: md5(message_id + channel_id + filename + timestamp)
    message = fields.ForeignKeyField("models.Message", related_name="clips", indexable=True)
    guild = fields.ForeignKeyField("models.Guild", related_name="clips", indexable=True)
    channel = fields.ForeignKeyField("models.Channel", related_name="clips", indexable=True)
    author_id = fields.CharField(max_length=64, indexable=True) # Message author's user snowflake
    title = fields.CharField(max_length=255)
    visibility = fields.CharEnumField(Visibility, default=Visibility.PUBLIC)
    filename = fields.CharField(max_length=255)
    file_size = fields.BigIntField()  # Bytes
    mime_type = fields.CharField(max_length=50)
    duration = fields.FloatField(null=True)  # Seconds (if extracted)
    resolution = fields.CharField(max_length=20, null=True)  # e.g., "1920x1080"
    settings_hash = fields.CharField(max_length=32, null=True)  # Hash of settings for this clip, used for settings invalidation, 32 char md5 hash
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

    class Meta:
        unique_together=("guild", "channel", "message", "id")
        table="clip"
        indexes=[
            ("channel_id", "created_at"),      # Clip pagination by channel
            ("guild_id", "channel_id"),        # Clip filtering by guild and channel
            ("thumbnail_status",),             # Thumbnail retry queries
            ("expires_at",),                   # CDN URL refresh queries
        ]

class Thumbnail(Model):
    """Generated thumbnail for a clip"""
    id = fields.CharField(max_length=64, indexable=True, pk=True)  # UUID
    clip = fields.ForeignKeyField("models.Clip", related_name="thumbnails", indexable=True)
    size_type = fields.CharField(max_length=10)  # 'small' or 'large'
    storage_path = fields.TextField()  # Local path or cloud bucket path
    width = fields.IntField()
    height = fields.IntField()
    file_size = fields.BigIntField()  # Bytes
    mime_type = fields.CharField(max_length=20, default="image/webp")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    deleted_at = fields.DatetimeField(null=True)
    
    class Meta:
        unique_together = (("clip", "size_type"),)  # One small and one large per clip


class FailedThumbnail(Model):
    """Track failed thumbnail generation for retry logic"""
    id = fields.CharField(max_length=64, indexable=True, pk=True)  # UUID
    clip = fields.ForeignKeyField("models.Clip", related_name="failed_thumbnails", indexable=True)
    error_message = fields.TextField()
    retry_count = fields.IntField(default=0)
    last_attempted_at = fields.DatetimeField(null=True)
    next_retry_at = fields.DatetimeField()  # When to next attempt
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table="failed_thumbnail"
        indexes=[
            ("next_retry_at",),  # Thumbnails ready for retry
        ]

class InstallIntent(Model):
    """Short-lived OAuth state for bot installation"""
    id = fields.IntField(auto_increment=True, pk=True)  # auto id
    user = fields.ForeignKeyField("models.User", related_name="install_intents", indexable=True)  # User must exist (logged in to interface)
    guild = fields.CharField(max_length=64)  # Target guild if known (no FK, guild might not exist yet)
    state = fields.TextField()  # OAuth state for verification
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table="install_intent"


# Optional: Job tracking table for monitoring and debugging
class Job(Model):
    """Track queued and processed jobs for monitoring"""
    id = fields.TextField(pk=True)  # UUID from Redis job
    type = fields.CharField(max_length=50)  # batch, message, rescan, thumbnail_retry
    guild = fields.ForeignKeyField("models.Guild", related_name="jobs", indexable=True)
    channel = fields.ForeignKeyField("models.Channel", related_name="jobs", indexable=True)
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

    class Meta:
        table="job"