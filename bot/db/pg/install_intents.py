"""Repository helpers to initialize the `install_intents` table.

This repository intentionally exposes no CRUD helpers; the bot only needs to
ensure the table exists.
"""

from __future__ import annotations


class InstallIntentsRepository:
    """Initializer for the `install_intents` table."""

    CREATE_TABLE_SQL = """
    create table if not exists install_intents (
        state text primary key,
        user_id bigint not null references users(id) on delete cascade,
        guild_id bigint not null,
        created_at timestamp default current_timestamp,
        expires_at timestamp not null
    );
    """

    def __init__(self, handler):
        self._handler = handler

    def ensure_tables(self, cursor) -> None:
        cursor.execute(self.CREATE_TABLE_SQL)
