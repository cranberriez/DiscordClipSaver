from __future__ import annotations

from typing import List

import discord

import db.database as db
from db.types import GuildSnapshot
from logger import logger
from lib.guild_gather import gather_guilds
from .state import BotState
from .settings_service import SettingsService


class GuildService:
    """Orchestrates guild discovery/sync and join/remove flows."""

    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_guilds(self, bot: discord.Client) -> List[GuildSnapshot]:
        """Discover current guilds, persist them in batch, update bot state, ensure defaults."""
        snapshots = list(await gather_guilds(bot))

        # Persist in batch
        await db.upsert_guilds(snapshots)

        # Update bot state
        _ensure_state(bot)
        bot.state.available_guilds = {snap.id: snap for snap in snapshots}  # type: ignore[attr-defined]

        # Ensure settings defaults where missing
        await self._settings.ensure_defaults_for_guilds([snap.id for snap in snapshots])

        if snapshots:
            guild_names = ", ".join(s.name for s in snapshots)
            logger.info("Accessible guilds: %s", guild_names)
        else:
            logger.info("No accessible guilds found for the bot.")

        return snapshots

    async def on_guild_join(self, bot: discord.Client, guild: discord.Guild) -> None:
        # Reuse gather helper for consistency
        snapshots = list(await gather_guilds(bot))
        snapshot = next((s for s in snapshots if s.id == str(guild.id)), None)
        if snapshot is None:
            # Fallback: minimal snapshot if not present (unlikely)
            snapshot = GuildSnapshot(id=str(guild.id), name=guild.name, icon=None, joined_at=None, channels=())
        await db.upsert_guilds([snapshot])

        _ensure_state(bot)
        bot.state.available_guilds[snapshot.id] = snapshot  # type: ignore[attr-defined]

        await self._settings.ensure_defaults_for_guilds([snapshot.id])
        logger.info("Joined guild: %s (%s)", guild.name, guild.id)

    async def on_guild_remove(self, bot: discord.Client, guild: discord.Guild) -> None:
        gid = str(guild.id)
        await db.delete_guilds([gid])

        if hasattr(bot, "state") and bot.state and gid in bot.state.available_guilds:  # type: ignore[attr-defined]
            del bot.state.available_guilds[gid]  # type: ignore[attr-defined]
        logger.info("Removed from guild: %s (%s)", guild.name, guild.id)


def _ensure_state(bot: discord.Client) -> None:
    """Attach a BotState if missing (idempotent)."""
    if not hasattr(bot, "state") or bot.state is None:  # type: ignore[attr-defined]
        bot.state = BotState()  # type: ignore[attr-defined]
