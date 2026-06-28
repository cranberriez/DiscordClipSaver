"""
One-shot database schema initialization.

This keeps schema creation out of long-running Discord services while preserving
the current Tortoise-generated schema workflow until proper migrations are added.
"""
import asyncio
import logging
import os

from shared.db.utils import close_db, init_db

logger = logging.getLogger(__name__)


async def init_schema_with_retries() -> None:
    max_attempts = int(os.getenv("DB_SCHEMA_INIT_MAX_ATTEMPTS", "10"))
    retry_seconds = float(os.getenv("DB_SCHEMA_INIT_RETRY_SECONDS", "2"))

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(
                "Initializing database schema (attempt %s/%s)",
                attempt,
                max_attempts,
            )
            await init_db(generate_schemas=True)
            logger.info("Database schema initialized")
            return
        except Exception:
            await close_db()
            if attempt >= max_attempts:
                logger.exception("Database schema initialization failed")
                raise
            logger.warning(
                "Database schema initialization failed; retrying in %.1fs",
                retry_seconds,
                exc_info=True,
            )
            await asyncio.sleep(retry_seconds)


async def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        await init_schema_with_retries()
    finally:
        await close_db()


if __name__ == "__main__":
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
