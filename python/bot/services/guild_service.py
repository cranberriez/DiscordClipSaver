from __future__ import annotations

import discord

from shared.db.repositories.guilds import (
    upsert_guilds as db_upsert_guilds,
    delete_single_guild as db_delete_single_guild,
)
from shared.db.repositories.guild_settings import upsert_guild_settings as db_upsert_guild_settings
from bot.logger import logger
from bot.lib.guild_gather import gather_guilds, build_guild_snapshot


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
           
            for guild in snapshots:
                await db_upsert_guild_settings(str(guild.id), self._settings.get_config("guild_settings_defaults"), self._settings.get_config("channel_settings_defaults"))
                logger.info("Synced guild settings for guild: %s (%s)", guild.name, guild.id)

            logger.info("Accessible guilds: %s", guild_names)
        else:
            logger.info("No accessible guilds found for the bot.")

    async def on_guild_join(self, guild: discord.Guild) -> None:
        # Reuse gather helper for consistency
        snapshot = build_guild_snapshot(guild)
        await db_upsert_guilds([snapshot])
        await db_upsert_guild_settings(str(guild.id), self._settings.get_config("guild_settings_defaults"), self._settings.get_config("channel_settings_defaults"))

        logger.info("Joined guild: %s (%s)", guild.name, guild.id)

    async def on_guild_remove(self, guild: discord.Guild) -> None:
        await db_delete_single_guild(str(guild.id))
        logger.info("Removed from guild: %s (%s)", guild.name, guild.id)

    async def on_guild_update(self, guild: discord.Guild) -> None:
        # Reuse gather helper for consistency
        snapshot = build_guild_snapshot(guild)
        await db_upsert_guilds([snapshot])

        logger.info("Updated guild: %s (%s)", guild.name, guild.id)