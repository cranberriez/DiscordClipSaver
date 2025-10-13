from __future__ import annotations

from typing import List

import discord

from shared.db.repositories.guilds import (
    upsert_guilds as db_upsert_guilds,
    delete_guilds as db_delete_guilds,
)
from shared.db.types import GuildSnapshot
from bot.logger import logger
from bot.lib.guild_gather import gather_guilds
from bot.services import bot_state_service as bot_state


class GuildService:
    """Orchestrates guild discovery/sync and join/remove flows."""

    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_guilds(self, bot: discord.Client) -> List[GuildSnapshot]:
        """Discover current guilds, persist them in batch, update bot state, ensure defaults."""
        async with bot_state.status_scope(bot, "sync:guilds"):
            snapshots = list(await gather_guilds(bot))

            # Persist in batch
            await db_upsert_guilds(snapshots)

            # Update bot state (centralized)
            bot_state.set_guilds(bot, snapshots)

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
            snapshot = GuildSnapshot(id=str(guild.id), name=guild.name, icon=None, joined_at=None)
        await db_upsert_guilds([snapshot])

        # Update centralized state
        bot_state.add_or_update_guild(bot, snapshot)

        logger.info("Joined guild: %s (%s)", guild.name, guild.id)

    async def on_guild_remove(self, bot: discord.Client, guild: discord.Guild) -> None:
        gid = str(guild.id)
        await db_delete_guilds([gid])
        # Update centralized state
        bot_state.remove_guild(bot, gid)
        logger.info("Removed from guild: %s (%s)", guild.name, guild.id)

