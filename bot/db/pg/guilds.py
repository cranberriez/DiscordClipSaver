"""
Repositories for guild-related Postgres operations.
"""

from __future__ import annotations

from typing import Any, Iterable, Optional

from ..types import GuildSnapshot


class GuildRepository:
    """CRUD helpers for the `bot_guilds` table."""

    CREATE_TABLE_SQL = """
    create table if not exists bot_guilds (
        guild_id text primary key,
        name text not null,
        joined_at timestamptz default now(),
        last_seen_at timestamptz default now()
    );
    """

    UPSERT_GUILD_SQL = """
    insert into bot_guilds (guild_id, name, joined_at, last_seen_at)
    values (%s, %s, coalesce(%s, now()), now())
    on conflict (guild_id) do update
      set name = excluded.name,
          last_seen_at = now();
    """

    DELETE_GUILDS_SQL = """
    delete from bot_guilds where guild_id = any(%s)
    """

    TOUCH_GUILD_SQL = """
    update bot_guilds set last_seen_at = now() where guild_id = %s
    """

    def __init__(self, handler):
        self._handler = handler

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------
    def ensure_tables(self, cursor) -> None:
        cursor.execute(self.CREATE_TABLE_SQL)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------
    def upsert(self, *, guild_id: str, name: str, joined_at: Optional[str] = None) -> None:
        self._handler.execute(self.UPSERT_GUILD_SQL, (guild_id, name, joined_at))

    def delete_many(self, guild_ids: Iterable[str]) -> None:
        guild_ids = list(guild_ids)
        if not guild_ids:
            return
        self._handler.execute(self.DELETE_GUILDS_SQL, (guild_ids,))

    def touch_last_seen(self, guild_id: str) -> None:
        self._handler.execute(self.TOUCH_GUILD_SQL, (guild_id,))

    def upsert_many(self, guilds: Iterable[GuildSnapshot]) -> None:
        for guild in guilds:
            self.upsert(guild_id=guild.id, name=guild.name, joined_at=guild.joined_at)


class GuildSettingsRepository:
    """Helpers for the `guild_settings` table."""

    CREATE_TABLE_SQL = """
    create table if not exists guild_settings (
        guild_id text primary key,
        settings jsonb not null default '{}'::jsonb,
        updated_at timestamptz default now()
    );
    """

    FETCH_SQL = """
    select guild_id, settings, updated_at from guild_settings where guild_id = %s
    """

    UPSERT_SQL = """
    insert into guild_settings (guild_id, settings)
    values (%s, %s)
    on conflict (guild_id) do update set
        settings = excluded.settings,
        updated_at = now()
    returning guild_id, settings, updated_at
    """

    UPDATE_SQL = """
    update guild_settings
    set settings = settings || %s::jsonb,
        updated_at = now()
    where guild_id = %s
    returning guild_id, settings, updated_at
    """

    def __init__(self, handler):
        self._handler = handler

    def ensure_tables(self, cursor) -> None:
        cursor.execute(self.CREATE_TABLE_SQL)

    def fetch(self, guild_id: str) -> Optional[tuple[Any, ...]]:
        return self._handler.execute_one(self.FETCH_SQL, (guild_id,))

    def ensure(self, guild_id: str, defaults: Optional[dict] = None):
        defaults = defaults or {}
        existing = self.fetch(guild_id)
        if existing:
            return existing
        return self._handler.execute_one(self.UPSERT_SQL, (guild_id, defaults))

    def update(self, guild_id: str, values: dict):
        return self._handler.execute_one(self.UPDATE_SQL, (values, guild_id))