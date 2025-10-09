from __future__ import annotations

from .settings_service import SettingsService
from .guild_service import GuildService

# Construct service singletons
settings_service = SettingsService()
guild_service = GuildService(settings_service=settings_service)
