"""Top-level database helpers that proxy to the configured DB handler."""

from __future__ import annotations

import os
from typing import Iterable, Optional

from .types import GuildSnapshot


_handler = None


def configure(handler) -> None:
    """Register the database handler instance used by this module."""

    global _handler
    _handler = handler


def _require_handler():
    if _handler is None:
        raise RuntimeError("Database handler has not been configured. Call configure(handler) first.")
    return _handler


def init_db() -> None:
    """Ensure the database is ready for use (connect + create tables)."""

    _require_handler().initialize()


def configure_from_env() -> None:
    """Configure the database handler based on environment variables."""

    db_type = (os.getenv("DB_TYPE") or os.getenv("DATABASE_TYPE") or "postgres").lower()
    if db_type != "postgres":
        raise ValueError(f"Unsupported DB_TYPE '{db_type}'. Only 'postgres' is currently supported.")

    from .pg.handler import PostgresHandler  # Local import to avoid circular deps

    configure(PostgresHandler())


def get_handler():
    """Return the currently configured handler instance."""

    return _require_handler()


def upsert_guild(*, guild_id: str, name: str, joined_at=None) -> None:
    _require_handler().guilds.upsert(guild_id=guild_id, name=name, joined_at=joined_at)


def upsert_guilds(guilds: Iterable[GuildSnapshot]) -> None:
    _require_handler().guilds.upsert_many(guilds)


def delete_guilds(guild_ids: list[str]) -> None:
    _require_handler().guilds.delete_many(guild_ids)


def touch_guild(guild_id: str) -> None:
    _require_handler().guilds.touch_last_seen(guild_id)


def get_guild_settings(guild_id: str):
    return _require_handler().guild_settings.fetch(guild_id)


def ensure_guild_settings(guild_id: str, defaults: Optional[dict] = None):
    return _require_handler().guild_settings.ensure(guild_id, defaults=defaults)


def update_guild_settings(guild_id: str, values: dict) -> None:
    _require_handler().guild_settings.update(guild_id, values)