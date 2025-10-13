import os
from typing import Dict, Any
from urllib.parse import quote_plus

def _build_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    db_type = os.getenv("DB_TYPE", "sqlite")
    if db_type == "sqlite":
        return "sqlite://:memory:"
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    user = os.getenv("DB_USER", "")
    password = os.getenv("DB_PASSWORD", "")
    name = os.getenv("DB_NAME", "")
    auth = ""
    if user:
        if password:
            auth = f"{quote_plus(user)}:{quote_plus(password)}@"
        else:
            auth = f"{quote_plus(user)}@"
    return f"{db_type}://{auth}{host}:{port}/{name}"

DATABASE_URL = _build_database_url()

TORTOISE_ORM: Dict[str, Any] = {
    "connections": {
        "default": DATABASE_URL,
    },
    "apps": {
        "models": {
            # Add your models modules here
            "models": [
                "shared.db.models",
            ],
            "default_connection": "default",
        }
    },
}
