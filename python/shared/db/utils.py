from typing import Dict, Any, Optional

from tortoise import Tortoise
from .config import get_tortoise_config
import logging

logger = logging.getLogger(__name__)


async def init_db(generate_schemas: bool = False, config: Optional[Dict[str, Any]] = None) -> None:
    try:
        tortoise_config = config or get_tortoise_config()
        logger.info("Initializing database, tortoise config: %s", tortoise_config)
        await Tortoise.init(config=tortoise_config)
        if generate_schemas:
            await Tortoise.generate_schemas(safe=False)
        logger.info("Database initialized successfully, schemas generated: %s, tortoise config: %s", generate_schemas, tortoise_config)
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    try:
        await Tortoise.close_connections()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")