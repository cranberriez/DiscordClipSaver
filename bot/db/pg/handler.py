"""
Postgres handler for table generation and initialization.
"""

from __future__ import annotations

import os

from dataclasses import dataclass
from typing import Optional

import psycopg
from psycopg import Connection
from psycopg.rows import RowFactory, dict_row

from . import guilds


@dataclass
class PostgresConfig:
    host: str = os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST", "localhost")
    port: int = int(os.getenv("POSTGRES_PORT") or os.getenv("DB_PORT", "5432"))
    user: str = os.getenv("POSTGRES_USER") or os.getenv("DB_USER", "postgres")
    password: str = os.getenv("POSTGRES_PASSWORD") or os.getenv("DB_PASSWORD", "postgres")
    database: str = os.getenv("POSTGRES_DB") or os.getenv("DB_NAME", "postgres")
    dsn: Optional[str] = os.getenv("POSTGRES_DSN") or os.getenv("DATABASE_URL")


class PostgresHandler:
    """Thin wrapper around a single psycopg connection and repo helpers."""

    def __init__(
        self,
        config: PostgresConfig | None = None,
        row_factory: RowFactory | None = dict_row,
    ):
        self._config = config or PostgresConfig()
        self._conn: Optional[Connection] = None
        self._row_factory: RowFactory | None = row_factory
        self.guilds = guilds.GuildRepository(self)
        self.guild_settings = guilds.GuildSettingsRepository(self)

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------
    def _ensure_connection(self) -> Connection:
        if self._conn is None:
            if self._config.dsn:
                self._conn = psycopg.connect(self._config.dsn, autocommit=True)
            else:
                self._conn = psycopg.connect(
                    host=self._config.host,
                    port=self._config.port,
                    user=self._config.user,
                    password=self._config.password,
                    dbname=self._config.database,
                    autocommit=True,
                )
            if self._row_factory:
                self._conn.row_factory = self._row_factory
        return self._conn

    def connection(self) -> Connection:
        return self._ensure_connection()

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    # ------------------------------------------------------------------
    # High-level operations invoked by the facade
    # ------------------------------------------------------------------
    def initialize(self) -> None:
        """Open the connection and ensure all required tables exist."""

        conn = self._ensure_connection()
        with conn.cursor() as cur:
            self.guilds.ensure_tables(cur)
            self.guild_settings.ensure_tables(cur)

    def execute(self, query: str, params: Optional[tuple] = None):
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            if params is None:
                cur.execute(query)
            else:
                cur.execute(query, params)
            if cur.description:
                return cur.fetchall()
            return None

    def execute_one(self, query: str, params: Optional[tuple] = None):
        conn = self._ensure_connection()
        with conn.cursor() as cur:
            if params is None:
                cur.execute(query)
            else:
                cur.execute(query, params)
            if cur.description:
                return cur.fetchone()
            return None