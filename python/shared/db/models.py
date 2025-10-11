"""Tortoise ORM models for Discord Clip Saver database."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from tortoise import fields
from tortoise.models import Model


class ScanStatus(str, Enum):
    """Enum for channel scan run status."""
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class User(Model):
    """Discord user model."""
    
    discord_user_id = fields.CharField(max_length=255, pk=True)
    username = fields.CharField(max_length=255, null=True)
    discriminator = fields.CharField(max_length=10, null=True)
    avatar = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    # Reverse relations
    owned_guilds: fields.ReverseRelation["Guild"]
    
    class Meta:
        table = "users"
        
    def __str__(self):
        return f"User({self.discord_user_id}, {self.username})"


class Guild(Model):
    """Discord guild (server) model."""
    
    guild_id = fields.CharField(max_length=255, pk=True)
    name = fields.CharField(max_length=255)
    icon = fields.CharField(max_length=255, null=True)
    owner_user_id = fields.ForeignKeyField(
        "models.User",
        related_name="owned_guilds",
        null=True,
        on_delete=fields.SET_NULL,
        db_column="owner_user_id",
    )
    joined_at = fields.DatetimeField(null=True)
    last_seen_at = fields.DatetimeField(auto_now_add=True)
    
    # Reverse relations
    channels: fields.ReverseRelation["Channel"]
    settings: fields.ReverseRelation["GuildSettings"]
    
    class Meta:
        table = "bot_guilds"
        
    def __str__(self):
        return f"Guild({self.guild_id}, {self.name})"


class GuildSettings(Model):
    """Guild settings model."""
    
    guild_id = fields.CharField(max_length=255, pk=True)
    settings = fields.JSONField(default=dict)
    updated_at = fields.DatetimeField(auto_now=True)
    
    class Meta:
        table = "guild_settings"
        
    def __str__(self):
        return f"GuildSettings({self.guild_id})"


class Channel(Model):
    """Discord channel model."""
    
    channel_id = fields.CharField(max_length=255, pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="channels",
        on_delete=fields.CASCADE,
        db_column="guild_id",
    )
    name = fields.CharField(max_length=255, null=True)
    type = fields.CharField(max_length=50, null=True)
    is_nsfw = fields.BooleanField(default=False)
    
    # Bot read state
    is_reading = fields.BooleanField(default=False)
    last_message_id = fields.CharField(max_length=255, null=True)
    last_scanned_at = fields.DatetimeField(null=True)
    last_activity_at = fields.DatetimeField(null=True)
    
    # Counters
    message_count = fields.BigIntField(default=0)
    
    # Settings (channel-specific overrides)
    settings = fields.JSONField(default=dict)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    # Reverse relations
    scan_runs: fields.ReverseRelation["ChannelScanRun"]
    
    class Meta:
        table = "bot_channels"
        
    def __str__(self):
        return f"Channel({self.channel_id}, {self.name})"


class ChannelScanRun(Model):
    """Channel scan run model."""
    
    id = fields.UUIDField(pk=True)
    channel = fields.ForeignKeyField(
        "models.Channel",
        related_name="scan_runs",
        on_delete=fields.CASCADE,
        db_column="channel_id",
    )
    after_message_id = fields.CharField(max_length=255, null=True)
    before_message_id = fields.CharField(max_length=255, null=True)
    status = fields.CharEnumField(ScanStatus, default=ScanStatus.QUEUED)
    messages_scanned = fields.BigIntField(default=0)
    messages_matched = fields.BigIntField(default=0)
    error_message = fields.TextField(null=True)
    started_at = fields.DatetimeField(null=True)
    finished_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    
    class Meta:
        table = "bot_channel_scan_runs"
        
    def __str__(self):
        return f"ChannelScanRun({self.id}, {self.status})"


class InstallIntent(Model):
    """Install intent model for OAuth flow."""
    
    state = fields.CharField(max_length=255, pk=True)
    guild_id = fields.CharField(max_length=255, null=True)
    user_id = fields.CharField(max_length=255, null=True)
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)
    
    class Meta:
        table = "install_intents"
        
    def __str__(self):
        return f"InstallIntent({self.state})"
