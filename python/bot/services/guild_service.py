from __future__ import annotations

import discord

from shared.db.repositories.guilds import (
    upsert_guilds as db_upsert_guilds,
    delete_single_guild as db_delete_single_guild,
)
from shared.db.repositories.guild_settings import upsert_guild_settings as db_upsert_guild_settings
from shared.db.repositories.channel_scan_status import update_scan_status
from shared.db.models import ChannelScanStatus, ScanStatus
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
        guild_id = str(guild.id)
        
        # Stop all active scans for this guild
        try:
            running_scans = await ChannelScanStatus.filter(
                guild_id=guild_id,
                status=ScanStatus.RUNNING
            ).all()
            
            for scan in running_scans:
                await update_scan_status(
                    guild_id=guild_id,
                    channel_id=scan.channel_id,
                    status=ScanStatus.CANCELLED,
                    error_message="Scan stopped - bot removed from guild"
                )
            
            if running_scans:
                logger.info("Stopped %d active scan(s) for guild %s", len(running_scans), guild_id)
        except Exception as e:
            logger.warning("Failed to stop scans for guild %s: %s", guild_id, e)
        
        # Delete all scan statuses for this guild to ensure a fresh start on re-join
        # This prevents "Initial Scan" from thinking it's already done if re-added
        try:
            deleted_count = await ChannelScanStatus.filter(guild_id=guild_id).delete()
            if deleted_count > 0:
                logger.info("Deleted %d scan status records for guild %s", deleted_count, guild_id)
        except Exception as e:
            logger.error("Failed to delete scan statuses for guild %s: %s", guild_id, e)

        # Soft delete guild (sets deleted_at timestamp)
        await db_delete_single_guild(guild_id)
        logger.info("Removed from guild: %s (%s) - marked as deleted", guild.name, guild.id)

    async def on_guild_update(self, guild: discord.Guild) -> None:
        # Reuse gather helper for consistency
        snapshot = build_guild_snapshot(guild)
        await db_upsert_guilds([snapshot])

        logger.info("Updated guild: %s (%s)", guild.name, guild.id)