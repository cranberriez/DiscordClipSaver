"""
Postgres handler for table generation and initialization (async psycopg3).
"""

from __future__ import annotations

import os

from dataclasses import dataclass
from typing import Optional

import psycopg
from psycopg import AsyncConnection
from psycopg.rows import RowFactory, dict_row

from . import guilds, install_intents, users, channels


@dataclass
class PostgresConfig:
    host: str = os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST", "localhost")
    port: int = int(os.getenv("POSTGRES_PORT") or os.getenv("DB_PORT", "5432"))
    user: str = os.getenv("POSTGRES_USER") or os.getenv("DB_USER", "postgres")
    password: str = os.getenv("POSTGRES_PASSWORD") or os.getenv("DB_PASSWORD", "postgres")
    database: str = os.getenv("POSTGRES_DB") or os.getenv("DB_NAME", "postgres")
    dsn: Optional[str] = os.getenv("POSTGRES_DSN") or os.getenv("DATABASE_URL")


class PostgresHandler:
    """Thin wrapper around a single psycopg async connection and repo helpers."""

    def __init__(
        self,
        config: PostgresConfig | None = None,
        row_factory: RowFactory | None = dict_row,
    ):
        self._config = config or PostgresConfig()
        self._conn: Optional[AsyncConnection] = None
        self._row_factory: RowFactory | None = row_factory
        self.users = users.UsersRepository(self)
        self.guilds = guilds.GuildRepository(self)
        self.guild_settings = guilds.GuildSettingsRepository(self)
        self.install_intents = install_intents.InstallIntentsRepository(self)
        self.channels = channels.ChannelsRepository(self)
        self.channel_scan_runs = channels.ChannelScanRunsRepository(self)

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------
    async def _ensure_connection(self) -> AsyncConnection:
        if self._conn is None:
            if self._config.dsn:
                self._conn = await psycopg.AsyncConnection.connect(self._config.dsn, autocommit=False)
            else:
                self._conn = await psycopg.AsyncConnection.connect(
                    host=self._config.host,
                    port=self._config.port,
                    user=self._config.user,
                    password=self._config.password,
                    dbname=self._config.database,
                    autocommit=False,
                )
            if self._row_factory:
                self._conn.row_factory = self._row_factory
        return self._conn

    async def connection(self) -> AsyncConnection:
        return await self._ensure_connection()

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    # ------------------------------------------------------------------
    # High-level operations invoked by the facade
    # ------------------------------------------------------------------
    async def initialize(self) -> None:
        """Open the connection and ensure all required tables exist."""

        conn = await self._ensure_connection()
        async with conn.cursor() as cur:
            await self.users.ensure_tables(cur)
            await self.guilds.ensure_tables(cur)
            await self.guild_settings.ensure_tables(cur)
            await self.channels.ensure_tables(cur)
            await self.install_intents.ensure_tables(cur)
            await self.channel_scan_runs.ensure_tables(cur)

    async def execute(self, query: str, params: Optional[tuple] = None):
        conn = await self._ensure_connection()
        async with conn.cursor() as cur:
            if params is None:
                await cur.execute(query)
            else:
                await cur.execute(query, params)
            if cur.description:
                return await cur.fetchall()
            # No result set => likely DML; commit
            await conn.commit()
            return None

    async def execute_one(self, query: str, params: Optional[tuple] = None):
        conn = await self._ensure_connection()
        async with conn.cursor() as cur:
            if params is None:
                await cur.execute(query)
            else:
                await cur.execute(query, params)
            if cur.description:
                return await cur.fetchone()
            # No result set => likely DML; commit
            await conn.commit()
            return None