"""Top-level async database helpers that proxy to the configured DB handler."""

from __future__ import annotations

import os
from typing import Iterable, Mapping, Optional, Any

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


async def init_db() -> None:
    """Ensure the database is ready for use (connect + create tables)."""

    await _require_handler().initialize()


def configure_from_env() -> None:
    """Configure the database handler based on environment variables."""

    db_type = (os.getenv("DB_TYPE") or os.getenv("DATABASE_TYPE") or "postgres").lower()
    if db_type != "postgres":
        raise ValueError(f"Unsupported DB TYPE '{db_type}'. Only 'postgres' is currently supported.")

    from .pg.handler import PostgresHandler  # Local import to avoid circular deps

    configure(PostgresHandler())


def get_handler():
    """Return the currently configured handler instance."""

    return _require_handler()


async def upsert_guild(*, guild_id: str, name: str, icon: str | None, owner_user_id: str | None = None, joined_at=None) -> None:
    await _require_handler().guilds.upsert(
        guild_id=guild_id, name=name, icon=icon, owner_user_id=owner_user_id, joined_at=joined_at
    )


async def upsert_guilds(guilds: Iterable[GuildSnapshot]) -> None:
    await _require_handler().guilds.upsert_many(guilds)


async def delete_guilds(guild_ids: list[str]) -> None:
    await _require_handler().guilds.delete_many(guild_ids)


async def touch_guild(guild_id: str) -> None:
    await _require_handler().guilds.touch_last_seen(guild_id)


async def get_guild_settings(guild_id: str):
    return await _require_handler().guild_settings.fetch(guild_id)


async def ensure_guild_settings(guild_id: str, defaults: Optional[dict] = None):
    return await _require_handler().guild_settings.ensure(guild_id, defaults=defaults)


async def update_guild_settings(guild_id: str, values: dict) -> None:
    await _require_handler().guild_settings.update(guild_id, values)


async def set_guild_settings(guild_id: str, settings: Mapping[str, Any]):
    await _require_handler().guild_settings.set_one(guild_id, dict(settings))


async def purge_expired_install_intents(grace_seconds: int = 300) -> int:
    """Delete expired rows from `install_intents` using a grace window.

    Returns the number of deleted rows.
    """
    return await _require_handler().install_intents.purge_expired(grace_seconds=grace_seconds)