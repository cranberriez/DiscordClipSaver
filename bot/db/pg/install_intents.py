"""Repository helpers to initialize the `install_intents` table (async).

This repository intentionally exposes no CRUD helpers; the bot only needs to
ensure the table exists.
"""

from __future__ import annotations


class InstallIntentsRepository:
    """Initializer for the `install_intents` table (async)."""

    CREATE_TABLE_SQL = """
    create table if not exists install_intents (
        state text primary key,
        user_id bigint not null references users(discord_user_id) on delete cascade,
        guild_id bigint not null,
        created_at timestamp default current_timestamp,
        expires_at timestamp not null
    );
    """

    def __init__(self, handler):
        self._handler = handler

    async def ensure_tables(self, cursor) -> None:
        await cursor.execute(self.CREATE_TABLE_SQL)

    async def purge_expired(self, grace_seconds: int = 300) -> int:
        """Delete rows whose `expires_at` is older than now minus the grace period.

        Returns the number of deleted rows.
        """
        conn = await self._handler.connection()
        async with conn.cursor() as cur:
            # Use a parameterized interval to avoid SQL injection and keep it portable
            await cur.execute(
                """
                delete from install_intents
                where expires_at <= (current_timestamp - (interval '1 second' * %s))
                """,
                (grace_seconds,),
            )
            return cur.rowcount
