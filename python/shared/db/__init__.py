"""Database module using Tortoise ORM."""

from .config import init_db, close_db, get_config
from .models import (
    User,
    Guild,
    GuildSettings,
    Channel,
    ChannelScanRun,
    InstallIntent,
    ScanStatus,
)
from .types import ChannelSnapshot, GuildSnapshot, GuildSettings as GuildSettingsType
from . import repositories

__all__ = [
    # Config functions
    "init_db",
    "close_db",
    "get_config",
    # Models
    "User",
    "Guild",
    "GuildSettings",
    "Channel",
    "ChannelScanRun",
    "InstallIntent",
    "ScanStatus",
    # Types
    "ChannelSnapshot",
    "GuildSnapshot",
    "GuildSettingsType",
    # Repository module
    "repositories",
]
