from __future__ import annotations

from .settings_service import SettingsService
from .guild_service import GuildService
from .channel_service import ChannelService

# Construct service singletons
settings_service = SettingsService()
guild_service = GuildService(settings_service=settings_service)
channel_service = ChannelService(settings_service=settings_service)
