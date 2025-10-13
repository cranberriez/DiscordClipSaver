from __future__ import annotations

from typing import Iterable, Optional, List

import discord

from shared.db.repositories.channels import (
    upsert_channels_for_guild as db_upsert_channels_for_guild,
)
from shared.db.types import ChannelSnapshot
from bot.services.settings_service import SettingsService
from bot.lib.channel_gather import gather_channels
from bot.services import bot_state_service as bot_state

class ChannelService:
    """Orchestrates channel discovery/sync and join/remove flows."""
    def __init__(self, settings_service: SettingsService) -> None:
        self._settings = settings_service

    async def sync_channels(self, bot: discord.Client, guild: discord.Guild) -> List[ChannelSnapshot]:
        async with bot_state.status_scope(bot, "sync:channels"):
            snapshots = list(await gather_channels(bot, guild))

            await db_upsert_channels_for_guild(str(guild.id), snapshots)

        return snapshots