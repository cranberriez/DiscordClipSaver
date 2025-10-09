from __future__ import annotations

import json
from typing import Any, Iterable, Optional

from ..types import ChannelSnapshot

# Repository implementations after the existing commented documentation, following the style of GuildRepository. Keep the comments intact.

class ChannelsRepository:
    """CRUD helpers for the `bot_channels` table (async)."""

    # Adapted to the codebase convention: use `bot_*` table names and `type` as TEXT
    CREATE_TABLE_SQL = """
    create table if not exists bot_channels (
        channel_id text primary key,
        guild_id text not null references bot_guilds(guild_id) on delete cascade,
        name text,
        type text,
        is_nsfw boolean default false,

        -- Bot read state
        is_reading boolean not null default false,
        last_message_id text,
        last_scanned_at timestamptz,
        last_activity_at timestamptz,

        -- Counters
        message_count bigint not null default 0,

        -- Settings
        settings jsonb not null default '{}'::jsonb,

        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
    );
    """

    CREATE_TRIGGER_FUNC_SQL = """
    create or replace function set_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end; $$ language plpgsql;
    """

    DROP_TRIGGER_SQL = """
    drop trigger if exists trg_bot_channels_updated_at on bot_channels
    """

    CREATE_TRIGGER_SQL = """
    create trigger trg_bot_channels_updated_at
    before update on bot_channels
    for each row execute function set_updated_at();
    """

    CREATE_INDEXES_SQL = [
        "create index if not exists idx_bot_channels_guild on bot_channels(guild_id)",
        "create index if not exists idx_bot_channels_isreading on bot_channels(is_reading) where is_reading = true",
        "create index if not exists idx_bot_channels_last_message_id on bot_channels(last_message_id)",
        "create index if not exists idx_bot_channels_work on bot_channels(guild_id, is_reading, last_scanned_at)",
    ]

    UPSERT_SQL = """
    insert into bot_channels (channel_id, guild_id, name, type, is_nsfw)
    values (%s, %s, %s, %s, coalesce(%s, false))
    on conflict (channel_id) do update set
        guild_id = excluded.guild_id,
        name = excluded.name,
        type = excluded.type,
        is_nsfw = excluded.is_nsfw,
        updated_at = now();
    """

    DELETE_MANY_SQL = """
    delete from bot_channels where channel_id = any(%s)
    """

    FETCH_BY_GUILD_SQL = """
    select * from bot_channels
    where guild_id = %s
    order by name nulls last, channel_id
    """

    SET_READING_SQL = """
    update bot_channels
    set is_reading = %s,
        settings = jsonb_set(settings, '{is_enabled}', to_jsonb(%s::boolean), true),
        updated_at = now()
    where channel_id = %s
    """

    UPDATE_CURSOR_SQL = """
    update bot_channels
    set last_message_id = %s,
        last_scanned_at = now(),
        updated_at = now()
    where channel_id = %s
    """

    UPDATE_PROGRESS_SQL = """
    update bot_channels
    set last_message_id = greatest(coalesce(nullif(last_message_id, '')::numeric, 0), %s::numeric)::text,
        last_scanned_at = now(),
        message_count = message_count + %s,
        updated_at = now()
    where channel_id = %s
    """

    TOUCH_ACTIVITY_SQL = """
    update bot_channels set last_activity_at = now(), updated_at = now() where channel_id = %s
    """

    INCR_MESSAGE_COUNT_SQL = """
    update bot_channels set message_count = message_count + %s, updated_at = now() where channel_id = %s
    """

    UPDATE_SETTINGS_SQL = """
    update bot_channels
    set settings = settings || %s::jsonb,
        updated_at = now()
    where channel_id = %s
    returning channel_id, settings, updated_at
    """

    SET_SETTINGS_SQL = """
    update bot_channels
    set settings = %s::jsonb,
        updated_at = now()
    where channel_id = %s
    returning channel_id, settings, updated_at
    """

    def __init__(self, handler):
        self._handler = handler

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------
    async def ensure_tables(self, cursor) -> None:
        await cursor.execute(self.CREATE_TABLE_SQL)
        await cursor.execute(self.CREATE_TRIGGER_FUNC_SQL)
        await cursor.execute(self.DROP_TRIGGER_SQL)
        await cursor.execute(self.CREATE_TRIGGER_SQL)
        for stmt in self.CREATE_INDEXES_SQL:
            await cursor.execute(stmt)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------
    async def upsert(
        self,
        *,
        channel_id: str,
        guild_id: str,
        name: Optional[str],
        type: Optional[str],
        is_nsfw: Optional[bool] = None,
    ) -> None:
        await self._handler.execute(self.UPSERT_SQL, (channel_id, guild_id, name, type, is_nsfw))

    async def upsert_many_for_guild(self, guild_id: str, channels: Iterable[ChannelSnapshot]) -> None:
        params = [(c.id, guild_id, c.name, c.type, c.is_nsfw) for c in channels]
        if not params:
            return
        conn = await self._handler.connection()
        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.executemany(self.UPSERT_SQL, params)

    async def delete_many(self, channel_ids: Iterable[str]) -> None:
        channel_ids = list(channel_ids)
        if not channel_ids:
            return
        await self._handler.execute(self.DELETE_MANY_SQL, (channel_ids,))

    async def fetch_by_guild(self, guild_id: str):
        return await self._handler.execute(self.FETCH_BY_GUILD_SQL, (guild_id,))

    async def set_reading(self, channel_id: str, is_reading: bool) -> None:
        await self._handler.execute(self.SET_READING_SQL, (is_reading, is_reading, channel_id))

    async def update_cursor(self, channel_id: str, last_message_id: Optional[str]) -> None:
        await self._handler.execute(self.UPDATE_CURSOR_SQL, (last_message_id, channel_id))

    async def update_progress(self, channel_id: str, last_seen_message_id: str, ingested_count: int) -> None:
        """Update channel cursor and counters after a successful ingest chunk.

        Numeric compare on snowflake IDs while storing as text.
        """
        await self._handler.execute(self.UPDATE_PROGRESS_SQL, (last_seen_message_id, ingested_count, channel_id))

    async def touch_activity(self, channel_id: str) -> None:
        await self._handler.execute(self.TOUCH_ACTIVITY_SQL, (channel_id,))

    async def increment_message_count(self, channel_id: str, by: int = 1) -> None:
        await self._handler.execute(self.INCR_MESSAGE_COUNT_SQL, (by, channel_id))

    async def update_settings(self, channel_id: str, values: dict[str, Any]):
        payload = json.dumps(values, separators=(",", ":"))
        return await self._handler.execute_one(self.UPDATE_SETTINGS_SQL, (payload, channel_id))

    async def set_settings(self, channel_id: str, settings: dict[str, Any]):
        payload = json.dumps(settings, separators=(",", ":"))
        return await self._handler.execute_one(self.SET_SETTINGS_SQL, (payload, channel_id))


class ChannelScanRunsRepository:
    """Helpers for the `bot_channel_scan_runs` table (async)."""

    CREATE_EXTENSION_SQL = """
    create extension if not exists pgcrypto
    """

    CREATE_TYPE_SQL = """
    do $$
    begin
        if not exists (select 1 from pg_type where typname = 'scan_status') then
            create type scan_status as enum ('queued','running','succeeded','failed','canceled');
        end if;
    end $$;
    """

    CREATE_TABLE_SQL = """
    create table if not exists bot_channel_scan_runs (
        id uuid primary key default gen_random_uuid(),
        channel_id text not null references bot_channels(channel_id) on delete cascade,
        after_message_id text,
        before_message_id text,
        status scan_status not null default 'queued',
        messages_scanned bigint not null default 0,
        messages_matched bigint not null default 0,
        error_message text,
        started_at timestamptz,
        finished_at timestamptz,
        created_at timestamptz not null default now()
    );
    """

    CREATE_INDEX_SQL = """
    create index if not exists idx_bot_scan_runs_channel on bot_channel_scan_runs(channel_id, created_at desc)
    """

    ENQUEUE_SQL = """
    insert into bot_channel_scan_runs (channel_id, after_message_id, status)
    select channel_id, last_message_id, 'queued'
    from bot_channels
    where channel_id = %s and is_reading = true
    returning id
    """

    MARK_STARTED_SQL = """
    update bot_channel_scan_runs
    set status = 'running', started_at = now()
    where id = %s and status = 'queued'
    returning id
    """

    UPDATE_PROGRESS_SQL = """
    update bot_channel_scan_runs
    set messages_scanned = messages_scanned + %s,
        messages_matched = messages_matched + %s
    where id = %s
    returning messages_scanned, messages_matched
    """

    MARK_SUCCEEDED_SQL = """
    update bot_channel_scan_runs
    set status = 'succeeded', finished_at = now()
    where id = %s and status in ('running','queued')
    returning id
    """

    MARK_FAILED_SQL = """
    update bot_channel_scan_runs
    set status = 'failed', finished_at = now(), error_message = %s
    where id = %s and status in ('queued','running')
    returning id
    """

    MARK_CANCELED_SQL = """
    update bot_channel_scan_runs
    set status = 'canceled', finished_at = now()
    where id = %s and status in ('queued','running')
    returning id
    """
    def __init__(self, handler):
        self._handler = handler

    async def ensure_tables(self, cursor) -> None:
        await cursor.execute(self.CREATE_EXTENSION_SQL)
        await cursor.execute(self.CREATE_TYPE_SQL)
        await cursor.execute(self.CREATE_TABLE_SQL)
        await cursor.execute(self.CREATE_INDEX_SQL)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------
    async def enqueue(self, channel_id: str) -> Optional[str]:
        row = await self._handler.execute_one(self.ENQUEUE_SQL, (channel_id,))
        if not row:
            return None
        # compatible with dict_row or tuple row_factory
        return row.get("id") if isinstance(row, dict) else row[0]

    async def mark_started(self, run_id: str) -> bool:
        row = await self._handler.execute_one(self.MARK_STARTED_SQL, (run_id,))
        return bool(row)

    async def update_progress(self, run_id: str, scanned_inc: int = 0, matched_inc: int = 0):
        return await self._handler.execute_one(self.UPDATE_PROGRESS_SQL, (scanned_inc, matched_inc, run_id))

    async def mark_succeeded(self, run_id: str) -> bool:
        row = await self._handler.execute_one(self.MARK_SUCCEEDED_SQL, (run_id,))
        return bool(row)

    async def mark_failed(self, run_id: str, error_message: str) -> bool:
        row = await self._handler.execute_one(self.MARK_FAILED_SQL, (error_message, run_id))
        return bool(row)

    async def mark_canceled(self, run_id: str) -> bool:
        row = await self._handler.execute_one(self.MARK_CANCELED_SQL, (run_id,))
        return bool(row)