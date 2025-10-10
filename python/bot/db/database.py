"""Top-level async database helpers that proxy to the configured DB handler."""

from __future__ import annotations

import os
from typing import Iterable, Mapping, Optional, Any

from .types import GuildSnapshot, ChannelSnapshot


_handler = None


def configure(handler) -> None:
    """Register the database handler instance used by this module."""

    global _handler
    _handler = handler


def _require_handler():
    if _handler is None:
        raise RuntimeError("Database handler has not been configured. Call configure(handler) first.")
    return _handler


async def init_db() -> None:
    """Ensure the database is ready for use (connect + create tables)."""

    await _require_handler().initialize()


def configure_from_env() -> None:
    """Configure the database handler based on environment variables."""

    db_type = (os.getenv("DB_TYPE") or os.getenv("DATABASE_TYPE") or "postgres").lower()
    if db_type != "postgres":
        raise ValueError(f"Unsupported DB TYPE '{db_type}'. Only 'postgres' is currently supported.")

    from .pg.handler import PostgresHandler  # Local import to avoid circular deps

    configure(PostgresHandler())


def get_handler():
    """Return the currently configured handler instance."""

    return _require_handler()


async def upsert_guild(*, guild_id: str, name: str, icon: str | None, owner_user_id: str | None = None, joined_at=None) -> None:
    await _require_handler().guilds.upsert(
        guild_id=guild_id, name=name, icon=icon, owner_user_id=owner_user_id, joined_at=joined_at
    )


async def upsert_guilds(guilds: Iterable[GuildSnapshot]) -> None:
    await _require_handler().guilds.upsert_many(guilds)


async def delete_guilds(guild_ids: list[str]) -> None:
    await _require_handler().guilds.delete_many(guild_ids)


async def touch_guild(guild_id: str) -> None:
    await _require_handler().guilds.touch_last_seen(guild_id)


async def get_guild_settings(guild_id: str):
    return await _require_handler().guild_settings.fetch(guild_id)


async def ensure_guild_settings(guild_id: str, defaults: Optional[dict] = None):
    return await _require_handler().guild_settings.ensure(guild_id, defaults=defaults)


async def update_guild_settings(guild_id: str, values: dict) -> None:
    await _require_handler().guild_settings.update(guild_id, values)


async def set_guild_settings(guild_id: str, settings: Mapping[str, Any]):
    await _require_handler().guild_settings.set_one(guild_id, dict(settings))

async def purge_expired_install_intents(grace_seconds: int = 300) -> int:
    """Delete expired rows from `install_intents` using a grace window.

    Returns the number of deleted rows.
    """
    return await _require_handler().install_intents.purge_expired(grace_seconds=grace_seconds)


# ------------------------------------------------------------------------------
# Channels Facade
# ------------------------------------------------------------------------------


async def upsert_channels_for_guild(guild_id: str, channels: Iterable[ChannelSnapshot]) -> None:
    """Batch upsert channels for a guild using a single executemany call."""
    await _require_handler().channels.upsert_many_for_guild(guild_id, channels)


async def get_channels_by_guild(guild_id: str):
    """Fetch channels for a guild, ordered by name then id."""
    return await _require_handler().channels.fetch_by_guild(guild_id)


async def set_channel_reading(channel_id: str, is_reading: bool) -> None:
    await _require_handler().channels.set_reading(channel_id, is_reading)


async def update_channel_cursor(channel_id: str, last_message_id: Optional[str]) -> None:
    await _require_handler().channels.update_cursor(channel_id, last_message_id)


async def update_channel_progress(channel_id: str, last_seen_message_id: str, ingested_count: int) -> None:
    """Update a channel's ingest cursor and counters after a successful chunk."""
    await _require_handler().channels.update_progress(channel_id, last_seen_message_id, ingested_count)


async def touch_channel_activity(channel_id: str) -> None:
    await _require_handler().channels.touch_activity(channel_id)


async def increment_channel_message_count(channel_id: str, by: int = 1) -> None:
    await _require_handler().channels.increment_message_count(channel_id, by)


async def update_channel_settings(channel_id: str, values: Mapping[str, Any]):
    return await _require_handler().channels.update_settings(channel_id, dict(values))

async def set_channel_settings(channel_id: str, settings: Mapping[str, Any]):
    return await _require_handler().channels.set_settings(channel_id, dict(settings))


async def delete_channels(channel_ids: Iterable[str]) -> None:
    await _require_handler().channels.delete_many(list(channel_ids))


# ------------------------------------------------------------------------------
# Channel Scan Runs Facade
# ------------------------------------------------------------------------------

async def enqueue_scan_run(channel_id: str) -> Optional[str]:
    """Enqueue a scan run for a channel if it is reading; returns run id or None."""
    return await _require_handler().channel_scan_runs.enqueue(channel_id)


async def mark_scan_started(run_id: str) -> bool:
    return await _require_handler().channel_scan_runs.mark_started(run_id)


async def update_scan_progress(run_id: str, scanned_inc: int = 0, matched_inc: int = 0):
    return await _require_handler().channel_scan_runs.update_progress(run_id, scanned_inc, matched_inc)


async def mark_scan_succeeded(run_id: str) -> bool:
    return await _require_handler().channel_scan_runs.mark_succeeded(run_id)


async def mark_scan_failed(run_id: str, error_message: str) -> bool:
    return await _require_handler().channel_scan_runs.mark_failed(run_id, error_message)


async def mark_scan_canceled(run_id: str) -> bool:
    return await _require_handler().channel_scan_runs.mark_canceled(run_id)