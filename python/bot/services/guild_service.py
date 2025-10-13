from __future__ import annotations

import discord

from shared.db.repositories.guilds import (
    upsert_guilds as db_upsert_guilds,
    delete_guilds as db_delete_guilds,
)
from bot.lib.types import GuildSnapshot
from bot.logger import logger
from bot.lib.guild_gather import gather_guilds


class GuildService:
    """Orchestrates guild discovery/sync and join/remove flows."""

    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_guilds(self, bot: discord.Client) -> None:
        """Discover current guilds, persist them in batch, update bot state, ensure defaults."""
        snapshots = list(await gather_guilds(bot))

        # Persist in batch
        await db_upsert_guilds(snapshots)

        if snapshots:
            guild_names = ", ".join(s.name for s in snapshots)
            logger.info("Accessible guilds: %s", guild_names)
        else:
            logger.info("No accessible guilds found for the bot.")

    async def on_guild_join(self, bot: discord.Client, guild: discord.Guild) -> None:
        # Reuse gather helper for consistency
        snapshots = list(await gather_guilds(bot))
        snapshot = next((s for s in snapshots if s.id == str(guild.id)), None)
        if snapshot is None:
            # Fallback: minimal snapshot if not present (unlikely)
            snapshot = GuildSnapshot(id=str(guild.id), name=guild.name, icon=None, joined_at=None)
        await db_upsert_guilds([snapshot])

        logger.info("Joined guild: %s (%s)", guild.name, guild.id)

    async def on_guild_remove(self, bot: discord.Client, guild: discord.Guild) -> None:
        gid = str(guild.id)
        await db_delete_guilds([gid])
        logger.info("Removed from guild: %s (%s)", guild.name, guild.id)

