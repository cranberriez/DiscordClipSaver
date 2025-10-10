"""
Repositories for guild-related Postgres operations (async psycopg3).
"""

from __future__ import annotations

import json

from typing import Any, Iterable, Optional

from ..types import GuildSnapshot


class GuildRepository:
    """CRUD helpers for the `bot_guilds` table (async)."""

    CREATE_TABLE_SQL = """
    create table if not exists bot_guilds (
        guild_id text primary key,
        name text not null,
        icon text,
        owner_user_id text references users(discord_user_id) on delete set null,
        joined_at timestamptz default now(),
        last_seen_at timestamptz default now()
    );
    """

    UPSERT_GUILD_SQL = """
    insert into bot_guilds (guild_id, name, icon, owner_user_id, joined_at, last_seen_at)
    values (%s, %s, %s, %s, coalesce(%s, now()), now())
    on conflict (guild_id) do update
      set name = excluded.name,
          icon = excluded.icon,
          owner_user_id = excluded.owner_user_id,
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
    async def ensure_tables(self, cursor) -> None:
        await cursor.execute(self.CREATE_TABLE_SQL)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------
    async def upsert(self, *, guild_id: str, name: str, icon: Optional[str], owner_user_id: Optional[str] = None, joined_at: Optional[str] = None) -> None:
        await self._handler.execute(self.UPSERT_GUILD_SQL, (guild_id, name, icon, owner_user_id, joined_at))

    async def delete_many(self, guild_ids: Iterable[str]) -> None:
        guild_ids = list(guild_ids)
        if not guild_ids:
            return
        await self._handler.execute(self.DELETE_GUILDS_SQL, (guild_ids,))

    async def touch_last_seen(self, guild_id: str) -> None:
        await self._handler.execute(self.TOUCH_GUILD_SQL, (guild_id,))

    async def upsert_many(self, guilds: Iterable[GuildSnapshot]) -> None:
        """Batch upsert guilds using executemany to reduce Python overhead.

        Wrapped in a transaction for atomicity and fewer commits.
        """
        params = [
            (g.id, g.name, g.icon, g.owner_user_id, g.joined_at) for g in guilds
        ]
        if not params:
            return
        conn = await self._handler.connection()
        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.executemany(self.UPSERT_GUILD_SQL, params)


class GuildSettingsRepository:
    """Helpers for the `guild_settings` table (async)."""

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

    SET_SQL = """
    update guild_settings
    set settings = %s::jsonb,
        updated_at = now()
    where guild_id = %s
    returning guild_id, settings, updated_at
    """

    def __init__(self, handler):
        self._handler = handler

    async def ensure_tables(self, cursor) -> None:
        await cursor.execute(self.CREATE_TABLE_SQL)

    async def fetch(self, guild_id: str) -> Optional[tuple[Any, ...]]:
        return await self._handler.execute_one(self.FETCH_SQL, (guild_id,))

    async def ensure(self, guild_id: str, defaults: Optional[dict] = None):
        defaults = defaults or {}
        existing = await self.fetch(guild_id)
        if existing:
            return existing
        payload = json.dumps(defaults, separators=(",", ":"))
        return await self._handler.execute_one(self.UPSERT_SQL, (guild_id, payload))

    async def set_many(self, guilds: Iterable[tuple[str, dict[str, Any]]]) -> None:
        """Batch set guilds using executemany to reduce Python overhead.

        Note: Connection currently runs with autocommit; this will not wrap in a single
        transaction yet but still reduces round-trips between Python and libpq.
        """
        params = list(guilds)
        if not params:
            return
        conn = await self._handler.connection()
        async with conn.cursor() as cur:
            await cur.executemany(self.SET_SQL, params)

    async def update(self, guild_id: str, values: dict[str, Any]):
        """Merge JSON fields into existing settings for a guild (partial update)."""
        payload = json.dumps(values, separators=(",", ":"))
        return await self._handler.execute_one(self.UPDATE_SQL, (payload, guild_id))

    async def set_one(self, guild_id: str, settings: dict[str, Any]):
        """Replace the entire settings JSON for a guild (full overwrite)."""
        payload = json.dumps(settings, separators=(",", ":"))
        return await self._handler.execute_one(self.SET_SQL, (payload, guild_id))