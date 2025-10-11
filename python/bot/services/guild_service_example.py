"""
Example of how to adapt guild_service.py to use the new shared module.
Compare with your current bot/services/guild_service.py to see the changes.
"""

from __future__ import annotations

from typing import List

import discord

# OLD IMPORTS (commented out):
# import db.database as db
# from db.types import GuildSnapshot

# NEW IMPORTS:
from shared.db import repositories as db
from shared.db.types import GuildSnapshot

from logger import logger
from lib.guild_gather import gather_guilds
from .state import BotState
from . import bot_state_service as bot_state
from .settings_service import SettingsService


class GuildService:
    """Orchestrates guild discovery/sync and join/remove flows."""

    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_guilds(self, bot: discord.Client) -> List[GuildSnapshot]:
        """Discover current guilds, persist them in batch, update bot state, ensure defaults."""
        async with bot_state.status_scope(bot, "sync:guilds"):
            snapshots = list(await gather_guilds(bot))

            # Persist in batch - SAME FUNCTION CALL as before!
            await db.upsert_guilds(snapshots)

            # Update bot state (centralized)
            bot_state.set_guilds(bot, snapshots)

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
            snapshot = GuildSnapshot(id=str(guild.id), name=guild.name, icon=None, joined_at=None)
        
        # SAME FUNCTION CALL as before!
        await db.upsert_guilds([snapshot])

        # Update centralized state
        bot_state.add_or_update_guild(bot, snapshot)

        await self._settings.ensure_defaults_for_guilds([snapshot.id])
        logger.info("Joined guild: %s (%s)", guild.name, guild.id)

    async def on_guild_remove(self, bot: discord.Client, guild: discord.Guild) -> None:
        gid = str(guild.id)
        
        # SAME FUNCTION CALL as before!
        await db.delete_guilds([gid])
        
        # Update centralized state
        bot_state.remove_guild(bot, gid)
        logger.info("Removed from guild: %s (%s)", guild.name, guild.id)


# NOTICE: The only changes are the import statements!
# All function calls remain exactly the same thanks to the repository layer.
