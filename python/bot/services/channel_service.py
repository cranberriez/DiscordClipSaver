from __future__ import annotations

from typing import List

import discord

from shared.db.repositories.channels import (
    upsert_channels_for_guild as db_upsert_channels_for_guild,
    delete_channels as db_delete_channels_for_guild,
    delete_single_channel as db_delete_channel_for_guild,
)
from bot.lib.types import ChannelSnapshot
from bot.services.settings_service import SettingsService
from bot.lib.channel_gather import gather_channels, build_channel_snapshot

class ChannelService:
    """Orchestrates channel discovery/sync and join/remove flows."""
    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_channels(self, bot: discord.Client, guild: discord.Guild) -> None:
        snapshots = list(await gather_channels(bot, guild))
        await db_upsert_channels_for_guild(str(guild.id), snapshots)

    async def remove_channels(self, guild: discord.Guild) -> None:
        await db_delete_channels_for_guild(str(guild.id), [str(channel.id) for channel in guild.channels])

    async def on_channel_delete(self, guild: discord.Guild, channel: discord.abc.GuildChannel) -> None:
        await db_delete_channel_for_guild(str(guild.id), str(channel.id))

    async def on_channel_crup(self, guild: discord.Guild, channel: discord.abc.GuildChannel) -> None:
        snapshot = build_channel_snapshot(channel)
        await db_upsert_channels_for_guild(str(guild.id), [snapshot])
