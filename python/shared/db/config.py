import os
from typing import Dict, Any
from urllib.parse import quote_plus

def _build_database_url() -> str:
    """
    Legacy URL builder for backward compatibility.
    Only used when DATABASE_URL env var is explicitly set.
    """
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    db_type = os.getenv("DB_TYPE", "postgres")

    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    name = os.getenv("DB_NAME", "postgres")
    auth = ""
    if user:
        if password:
            auth = f"{quote_plus(user)}:{quote_plus(password)}@"
        else:
            auth = f"{quote_plus(user)}@"
    return f"{db_type}://{auth}{host}:{port}/{name}"

def get_tortoise_config() -> Dict[str, Any]:
    """
    Get Tortoise ORM configuration with connection pooling.
    
    Connection pool settings are PER PROCESS (each worker gets its own pool).
    With N workers: total_db_connections = N × DB_POOL_MAX
    
    Environment Variables:
        DATABASE_URL: Full connection URL (overrides individual settings if set)
        DB_HOST: Database host (default: localhost)
        DB_PORT: Database port (default: 5432)
        DB_USER: Database user (default: postgres)
        DB_PASSWORD: Database password (default: postgres)
        DB_NAME: Database name (default: postgres)
        DB_POOL_MIN: Minimum connections per worker (default: 2)
        DB_POOL_MAX: Maximum connections per worker (default: 10)
        DB_MAX_QUERIES: Max queries before connection recycling (default: 50000)
        DB_MAX_IDLE_TIME: Max idle time in seconds (default: 300)
    
    Important: Ensure PostgreSQL max_connections > (num_workers × DB_POOL_MAX)
    Default PostgreSQL max_connections is usually 100.
    """
    # Check if DATABASE_URL is explicitly set (legacy mode)
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        # Legacy mode: use URL string (no pool configuration)
        return {
            "connections": {
                "default": database_url,
            },
            "apps": {
                "models": {
                    "models": [
                        "shared.db.models",
                    ],
                    "default_connection": "default",
                }
            },
        }
    
    # Modern mode: use credentials dict with connection pool settings
    db_type = os.getenv("DB_TYPE", "postgres")
    
    # Validate backend
    if db_type not in ["postgres", "postgresql"]:
        raise ValueError(
            f"DB_TYPE must be 'postgres' or 'postgresql', got '{db_type}'. "
            "Connection pooling configuration is only supported for PostgreSQL."
        )
    
    # Build credentials with pool configuration
    credentials = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres"),
        "database": os.getenv("DB_NAME", "postgres"),
        # Connection pool settings (per process)
        "minsize": int(os.getenv("DB_POOL_MIN", "2")),
        "maxsize": int(os.getenv("DB_POOL_MAX", "10")),
        "max_queries": int(os.getenv("DB_MAX_QUERIES", "50000")),
        "max_inactive_connection_lifetime": float(os.getenv("DB_MAX_IDLE_TIME", "300")),
    }
    
    return {
        "connections": {
            "default": {
                "engine": "tortoise.backends.asyncpg",
                "credentials": credentials,
            }
        },
        "apps": {
            "models": {
                "models": [
                    "shared.db.models",
                ],
                "default_connection": "default",
            }
        },
    }


DATABASE_URL = _build_database_url()

TORTOISE_ORM: Dict[str, Any] = get_tortoise_config()
