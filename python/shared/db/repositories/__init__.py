"""
Repository package for shared database query helpers

Provides reusable database query functions organized by domain.

Modules:
    - bulk_operations: Efficient bulk upsert operations using PostgreSQL INSERT ... ON CONFLICT
    - channel_scan_status: Channel scanning status management
    - channels: Channel-related queries
    - guild_settings: Guild settings management
    - guilds: Guild-related queries
    - install_intents: OAuth installation intent management
"""

from . import (
    bulk_operations,
    channel_scan_status,
    channels,
    guild_settings,
    guilds,
    install_intents,
)

__all__ = [
    'bulk_operations',
    'channel_scan_status',
    'channels',
    'guild_settings',
    'guilds',
    'install_intents',
]
