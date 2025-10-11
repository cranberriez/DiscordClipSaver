"""Repository layer providing the same interface as the old psycopg3 implementation."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Iterable, Mapping, Optional

from tortoise.transactions import in_transaction

from .models import (
    Channel,
    ChannelScanRun,
    Guild,
    GuildSettings,
    InstallIntent,
    ScanStatus,
    User,
)


# Type definitions matching the old system
class ChannelSnapshot:
    """Minimal representation of a Discord channel for persistence."""
    
    def __init__(
        self,
        id: str,
        name: str,
        type: str,
        is_nsfw: bool = False,
        settings_overrides: Optional[dict[str, Any]] = None,
    ):
        self.id = id
        self.name = name
        self.type = type
        self.is_nsfw = is_nsfw
        self.settings_overrides = settings_overrides or {}


class GuildSnapshot:
    """Minimal representation of a Discord guild for persistence."""
    
    def __init__(
        self,
        id: str,
        name: str,
        icon: str | None = None,
        owner_user_id: str | None = None,
        joined_at: datetime | None = None,
        channels: tuple[ChannelSnapshot, ...] = (),
    ):
        self.id = id
        self.name = name
        self.icon = icon
        self.owner_user_id = owner_user_id
        self.joined_at = joined_at
        self.channels = channels


# ------------------------------------------------------------------------------
# Guild Operations
# ------------------------------------------------------------------------------

async def upsert_guild(
    *,
    guild_id: str,
    name: str,
    icon: str | None,
    owner_user_id: str | None = None,
    joined_at: datetime | None = None,
) -> None:
    """Upsert a single guild."""
    await Guild.update_or_create(
        guild_id=guild_id,
        defaults={
            "name": name,
            "icon": icon,
            "owner_user_id_id": owner_user_id,  # Foreign key field
            "joined_at": joined_at or datetime.now(),
            "last_seen_at": datetime.now(),
        },
    )


async def upsert_guilds(guilds: Iterable[GuildSnapshot]) -> None:
    """Batch upsert guilds."""
    for guild in guilds:
        await upsert_guild(
            guild_id=guild.id,
            name=guild.name,
            icon=guild.icon,
            owner_user_id=guild.owner_user_id,
            joined_at=guild.joined_at,
        )


async def delete_guilds(guild_ids: list[str]) -> None:
    """Delete multiple guilds."""
    await Guild.filter(guild_id__in=guild_ids).delete()


async def touch_guild(guild_id: str) -> None:
    """Update last_seen_at for a guild."""
    await Guild.filter(guild_id=guild_id).update(last_seen_at=datetime.now())


# ------------------------------------------------------------------------------
# Guild Settings Operations
# ------------------------------------------------------------------------------

async def get_guild_settings(guild_id: str) -> Optional[dict]:
    """Fetch guild settings."""
    settings = await GuildSettings.get_or_none(guild_id=guild_id)
    if settings:
        return {
            "guild_id": settings.guild_id,
            "settings": settings.settings,
            "updated_at": settings.updated_at,
        }
    return None


async def ensure_guild_settings(
    guild_id: str,
    defaults: Optional[dict] = None,
) -> dict:
    """Ensure guild settings exist, creating with defaults if needed."""
    defaults = defaults or {}
    settings, created = await GuildSettings.get_or_create(
        guild_id=guild_id,
        defaults={"settings": defaults},
    )
    return {
        "guild_id": settings.guild_id,
        "settings": settings.settings,
        "updated_at": settings.updated_at,
    }


async def update_guild_settings(guild_id: str, values: dict) -> None:
    """Merge values into existing guild settings."""
    settings = await GuildSettings.get_or_none(guild_id=guild_id)
    if settings:
        # Merge the new values into existing settings
        settings.settings = {**settings.settings, **values}
        await settings.save()


async def set_guild_settings(guild_id: str, settings_dict: Mapping[str, Any]) -> None:
    """Replace guild settings entirely."""
    await GuildSettings.update_or_create(
        guild_id=guild_id,
        defaults={"settings": dict(settings_dict)},
    )


# ------------------------------------------------------------------------------
# Channel Operations
# ------------------------------------------------------------------------------

async def upsert_channels_for_guild(
    guild_id: str,
    channels: Iterable[ChannelSnapshot],
) -> None:
    """Batch upsert channels for a guild."""
    for channel in channels:
        # Merge settings overrides with existing settings
        existing = await Channel.get_or_none(channel_id=channel.id)
        if existing:
            new_settings = {**existing.settings, **(channel.settings_overrides or {})}
        else:
            new_settings = channel.settings_overrides or {}
        
        await Channel.update_or_create(
            channel_id=channel.id,
            defaults={
                "guild_id": guild_id,
                "name": channel.name,
                "type": channel.type,
                "is_nsfw": channel.is_nsfw,
                "settings": new_settings,
            },
        )


async def get_channels_by_guild(guild_id: str) -> list[dict]:
    """Fetch channels for a guild, ordered by name then id."""
    channels = await Channel.filter(guild_id=guild_id).order_by("name", "channel_id")
    return [
        {
            "channel_id": ch.channel_id,
            "guild_id": ch.guild_id,
            "name": ch.name,
            "type": ch.type,
            "is_nsfw": ch.is_nsfw,
            "is_reading": ch.is_reading,
            "last_message_id": ch.last_message_id,
            "last_scanned_at": ch.last_scanned_at,
            "last_activity_at": ch.last_activity_at,
            "message_count": ch.message_count,
            "settings": ch.settings,
            "created_at": ch.created_at,
            "updated_at": ch.updated_at,
        }
        for ch in channels
    ]


async def set_channel_reading(channel_id: str, is_reading: bool) -> None:
    """Set the reading state of a channel."""
    channel = await Channel.get_or_none(channel_id=channel_id)
    if channel:
        channel.is_reading = is_reading
        # Also update settings
        channel.settings["is_enabled"] = is_reading
        await channel.save()


async def update_channel_cursor(
    channel_id: str,
    last_message_id: Optional[str],
) -> None:
    """Update the last message ID cursor for a channel."""
    await Channel.filter(channel_id=channel_id).update(
        last_message_id=last_message_id,
        last_scanned_at=datetime.now(),
    )


async def update_channel_progress(
    channel_id: str,
    last_seen_message_id: str,
    ingested_count: int,
) -> None:
    """Update a channel's ingest cursor and counters after a successful chunk."""
    channel = await Channel.get_or_none(channel_id=channel_id)
    if channel:
        # Update to max of current and new message ID (snowflake comparison)
        current_id = int(channel.last_message_id) if channel.last_message_id else 0
        new_id = int(last_seen_message_id)
        if new_id > current_id:
            channel.last_message_id = last_seen_message_id
        
        channel.last_scanned_at = datetime.now()
        channel.message_count += ingested_count
        await channel.save()


async def touch_channel_activity(channel_id: str) -> None:
    """Update last activity timestamp for a channel."""
    await Channel.filter(channel_id=channel_id).update(
        last_activity_at=datetime.now()
    )


async def increment_channel_message_count(channel_id: str, by: int = 1) -> None:
    """Increment the message count for a channel."""
    channel = await Channel.get_or_none(channel_id=channel_id)
    if channel:
        channel.message_count += by
        await channel.save()


async def update_channel_settings(
    channel_id: str,
    values: Mapping[str, Any],
) -> dict:
    """Merge values into channel settings."""
    channel = await Channel.get_or_none(channel_id=channel_id)
    if channel:
        channel.settings = {**channel.settings, **dict(values)}
        await channel.save()
        return {
            "channel_id": channel.channel_id,
            "settings": channel.settings,
            "updated_at": channel.updated_at,
        }
    return {}


async def set_channel_settings(
    channel_id: str,
    settings: Mapping[str, Any],
) -> dict:
    """Replace channel settings entirely."""
    channel = await Channel.get_or_none(channel_id=channel_id)
    if channel:
        channel.settings = dict(settings)
        await channel.save()
        return {
            "channel_id": channel.channel_id,
            "settings": channel.settings,
            "updated_at": channel.updated_at,
        }
    return {}


async def delete_channels(channel_ids: Iterable[str]) -> None:
    """Delete multiple channels."""
    await Channel.filter(channel_id__in=list(channel_ids)).delete()


# ------------------------------------------------------------------------------
# Channel Scan Run Operations
# ------------------------------------------------------------------------------

async def enqueue_scan_run(channel_id: str) -> Optional[str]:
    """Enqueue a scan run for a channel if it is reading; returns run id or None."""
    channel = await Channel.get_or_none(channel_id=channel_id)
    if not channel or not channel.is_reading:
        return None
    
    scan_run = await ChannelScanRun.create(
        channel_id=channel_id,
        after_message_id=channel.last_message_id,
        status=ScanStatus.QUEUED,
    )
    return str(scan_run.id)


async def mark_scan_started(run_id: str) -> bool:
    """Mark a scan run as started."""
    updated = await ChannelScanRun.filter(
        id=run_id,
        status=ScanStatus.QUEUED,
    ).update(
        status=ScanStatus.RUNNING,
        started_at=datetime.now(),
    )
    return updated > 0


async def update_scan_progress(
    run_id: str,
    scanned_inc: int = 0,
    matched_inc: int = 0,
) -> Optional[dict]:
    """Update scan progress counters."""
    scan_run = await ChannelScanRun.get_or_none(id=run_id)
    if scan_run:
        scan_run.messages_scanned += scanned_inc
        scan_run.messages_matched += matched_inc
        await scan_run.save()
        return {
            "messages_scanned": scan_run.messages_scanned,
            "messages_matched": scan_run.messages_matched,
        }
    return None


async def mark_scan_succeeded(run_id: str) -> bool:
    """Mark a scan run as succeeded."""
    updated = await ChannelScanRun.filter(
        id=run_id,
        status__in=[ScanStatus.RUNNING, ScanStatus.QUEUED],
    ).update(
        status=ScanStatus.SUCCEEDED,
        finished_at=datetime.now(),
    )
    return updated > 0


async def mark_scan_failed(run_id: str, error_message: str) -> bool:
    """Mark a scan run as failed."""
    updated = await ChannelScanRun.filter(
        id=run_id,
        status__in=[ScanStatus.QUEUED, ScanStatus.RUNNING],
    ).update(
        status=ScanStatus.FAILED,
        finished_at=datetime.now(),
        error_message=error_message,
    )
    return updated > 0


async def mark_scan_canceled(run_id: str) -> bool:
    """Mark a scan run as canceled."""
    updated = await ChannelScanRun.filter(
        id=run_id,
        status__in=[ScanStatus.QUEUED, ScanStatus.RUNNING],
    ).update(
        status=ScanStatus.CANCELED,
        finished_at=datetime.now(),
    )
    return updated > 0


# ------------------------------------------------------------------------------
# Install Intent Operations
# ------------------------------------------------------------------------------

async def purge_expired_install_intents(grace_seconds: int = 300) -> int:
    """Delete expired install intents using a grace window."""
    cutoff = datetime.now() - timedelta(seconds=grace_seconds)
    deleted = await InstallIntent.filter(expires_at__lt=cutoff).delete()
    return deleted
