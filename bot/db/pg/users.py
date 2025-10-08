"""Repository helpers for the `users` table."""

from __future__ import annotations


class UsersRepository:
    """Schema helpers for the `users` table."""

    CREATE_TABLE_SQL = """
    create table if not exists users (
        id serial primary key,
        discord_user_id bigint unique not null,
        username text,
        global_name text,
        avatar text,
        last_login_at timestamptz
    );
    """

    def __init__(self, handler):
        self._handler = handler

    def ensure_tables(self, cursor) -> None:
        cursor.execute(self.CREATE_TABLE_SQL)

