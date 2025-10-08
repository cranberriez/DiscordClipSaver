"""Repository helpers for temporary guild pairing codes."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional


class PairingRepository:
    """CRUD helpers for the `pairing_codes` table."""

    CREATE_TABLE_SQL = """
    create table if not exists pairing_codes (
        code text primary key,
        guild_id text not null references bot_guilds(guild_id) on delete cascade,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null,
        unique (guild_id)
    );
    """

    UPSERT_SQL = """
    insert into pairing_codes (code, guild_id, expires_at)
    values (%s, %s, %s)
    on conflict (guild_id) do update set
        code = excluded.code,
        expires_at = excluded.expires_at,
        created_at = now()
    returning code, guild_id, created_at, expires_at
    """

    FETCH_BY_GUILD_SQL = """
    select code, guild_id, created_at, expires_at
    from pairing_codes
    where guild_id = %s
    """

    DELETE_BY_CODE_SQL = """
    delete from pairing_codes
    where code = %s
    returning code, guild_id, created_at, expires_at
    """

    DELETE_BY_GUILD_SQL = """
    delete from pairing_codes
    where guild_id = %s
    returning code, guild_id, created_at, expires_at
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
    def upsert(self, *, code: str, guild_id: str, expires_at: datetime) -> Optional[dict[str, Any]]:
        return self._handler.execute_one(self.UPSERT_SQL, (code, guild_id, expires_at))

    def fetch_by_guild(self, guild_id: str) -> Optional[dict[str, Any]]:
        return self._handler.execute_one(self.FETCH_BY_GUILD_SQL, (guild_id,))

    def delete_by_code(self, code: str) -> Optional[dict[str, Any]]:
        return self._handler.execute_one(self.DELETE_BY_CODE_SQL, (code,))

    def delete_by_guild(self, guild_id: str) -> Optional[dict[str, Any]]:
        return self._handler.execute_one(self.DELETE_BY_GUILD_SQL, (guild_id,))