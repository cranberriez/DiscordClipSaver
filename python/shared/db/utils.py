from tortoise import Tortoise
from .config import TORTOISE_ORM
import logging

logger = logging.getLogger(__name__)


async def init_db(generate_schemas: bool = False) -> None:
    try:
        await Tortoise.init(config=TORTOISE_ORM)
        if generate_schemas:
            await Tortoise.generate_schemas(safe=True)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    try:
        await Tortoise.close_connections()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")