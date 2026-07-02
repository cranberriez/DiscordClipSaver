from __future__ import annotations

from typing import TYPE_CHECKING

from .settings_service import SettingsService

if TYPE_CHECKING:
    from .channel_service import ChannelService
    from .guild_service import GuildService


def __getattr__(name: str):
    if name == "GuildService":
        from .guild_service import GuildService

        return GuildService
    if name == "ChannelService":
        from .channel_service import ChannelService

        return ChannelService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "SettingsService",
    "GuildService",
    "ChannelService",
]
