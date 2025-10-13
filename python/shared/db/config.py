import os
from typing import Dict, Any
from urllib.parse import quote_plus

def _build_database_url() -> str:
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
    return {
        "connections": {
            "default": _build_database_url(),
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
