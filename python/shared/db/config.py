"""Tortoise ORM database configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from tortoise import Tortoise


@dataclass
class DatabaseConfig:
    """Database configuration from environment variables."""
    
    host: str = os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST", "localhost")
    port: int = int(os.getenv("POSTGRES_PORT") or os.getenv("DB_PORT", "5432"))
    user: str = os.getenv("POSTGRES_USER") or os.getenv("DB_USER", "postgres")
    password: str = os.getenv("POSTGRES_PASSWORD") or os.getenv("DB_PASSWORD", "postgres")
    database: str = os.getenv("POSTGRES_DB") or os.getenv("DB_NAME", "postgres")
    dsn: Optional[str] = os.getenv("POSTGRES_DSN") or os.getenv("DATABASE_URL")
    
    def get_connection_string(self) -> str:
        """Generate PostgreSQL connection string."""
        if self.dsn:
            return self.dsn
        return f"postgres://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


_config: Optional[DatabaseConfig] = None


def get_config() -> DatabaseConfig:
    """Get the current database configuration."""
    global _config
    if _config is None:
        _config = DatabaseConfig()
    return _config


async def init_db(
    config: Optional[DatabaseConfig] = None,
    generate_schemas: bool = True,
) -> None:
    """
    Initialize Tortoise ORM with PostgreSQL.
    
    Args:
        config: Optional database configuration. If None, reads from environment.
        generate_schemas: If True, automatically create tables (for development).
    """
    global _config
    if config is None:
        config = get_config()
    else:
        _config = config
    
    await Tortoise.init(
        db_url=config.get_connection_string(),
        modules={"models": ["shared.db.models"]},
    )
    
    if generate_schemas:
        await Tortoise.generate_schemas()


async def close_db() -> None:
    """Close all database connections."""
    await Tortoise.close_connections()


# Tortoise ORM configuration dict (for aerich migrations)
TORTOISE_ORM = {
    "connections": {
        "default": os.getenv("DATABASE_URL") or get_config().get_connection_string()
    },
    "apps": {
        "models": {
            "models": ["shared.db.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}
