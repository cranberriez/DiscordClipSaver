from __future__ import annotations

from typing import Iterable, Optional, List

import discord

import db.database as db
from db.types import ChannelSnapshot
from .settings_service import SettingsService
from lib.channel_gather import gather_channels

class ChannelService:
    """Ircgestrates channel discovery/sync and join/remove flows."""
    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_channels(self, bot: discord.Client, guild: discord.Guild) -> List[ChannelSnapshot]:
        print("syncing channels")
        snapshots = list(await gather_channels(bot, guild))

        for channel in snapshots:
            print(f"{channel.name} : {channel.type}")

        return snapshots


    """
    High-level orchestration for channel persistence, toggling, and scan runs.

    Thin wrapper over the async DB facade in `db.database` to keep call sites clean.
    """

    # -----------------------------
    # Channels
    # -----------------------------
    async def upsert_for_guild(self, guild_id: str, channels: Iterable[ChannelSnapshot]) -> None:
        """Persist the provided channels for a guild (batch upsert)."""
        await db.upsert_channels_for_guild(guild_id, channels)

    async def list_by_guild(self, guild_id: str):
        """Return channels for the guild, ordered by name then id."""
        return await db.get_channels_by_guild(guild_id)

    async def set_reading(self, channel_id: str, is_reading: bool) -> None:
        """Toggle reading and keep `settings.is_enabled` mirrored for UI consistency."""
        await db.set_channel_reading(channel_id, is_reading)

    async def update_channel_progress(self, channel_id: str, last_seen_message_id: str, ingested_count: int) -> None:
        """Update ingest cursor and counters for a channel after a successful chunk."""
        await db.update_channel_progress(channel_id, last_seen_message_id, ingested_count)

    # -----------------------------
    # Scan runs
    # -----------------------------
    async def enqueue_scan(self, channel_id: str) -> Optional[str]:
        """Enqueue a scan run if channel is in reading mode; returns run id or None."""
        return await db.enqueue_scan_run(channel_id)

    async def mark_scan_started(self, run_id: str) -> bool:
        return await db.mark_scan_started(run_id)

    async def update_scan_progress(self, run_id: str, scanned_inc: int = 0, matched_inc: int = 0):
        return await db.update_scan_progress(run_id, scanned_inc, matched_inc)

    async def mark_scan_succeeded(self, run_id: str) -> bool:
        return await db.mark_scan_succeeded(run_id)

    async def mark_scan_failed(self, run_id: str, error_message: str) -> bool:
        return await db.mark_scan_failed(run_id, error_message)

    async def mark_scan_canceled(self, run_id: str) -> bool:
        return await db.mark_scan_canceled(run_id)
