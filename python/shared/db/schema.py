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

# Idempotent DDL applied after generate_schemas. Tortoise's generate_schemas
# (safe=True) only creates missing TABLES - it never adds columns to existing
# tables. Until a real migration tool (e.g. Aerich) is adopted, additive
# column changes MUST be mirrored here or existing databases silently drift.
MANUAL_MIGRATIONS = [
    # Channel access control (feat/channel-access)
    'ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "everyone_can_view" BOOLEAN NOT NULL DEFAULT TRUE',
    'ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "access_override" VARCHAR(10)',
    # PostgreSQL-native fuzzy clip search. These expression indexes match the
    # search documents assembled by the interface query builder.
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    '''CREATE INDEX IF NOT EXISTS "clip_search_trgm_idx"
       ON "clip" USING GIN (
           ((COALESCE("title", '') || ' ' || "filename")) gin_trgm_ops
       )''',
    '''CREATE INDEX IF NOT EXISTS "message_content_search_trgm_idx"
       ON "message" USING GIN ((COALESCE("content", '')) gin_trgm_ops)''',
    '''CREATE INDEX IF NOT EXISTS "author_name_search_trgm_idx"
       ON "author" USING GIN (
           ((COALESCE("display_name", '') || ' ' ||
             COALESCE("nickname", '') || ' ' ||
             COALESCE("username", ''))) gin_trgm_ops
       )''',
]


async def apply_manual_migrations() -> None:
    """Apply idempotent additive DDL that generate_schemas cannot handle."""
    from tortoise import connections

    conn = connections.get("default")
    for statement in MANUAL_MIGRATIONS:
        await conn.execute_script(statement)
    logger.info("Applied %d manual migration statement(s)", len(MANUAL_MIGRATIONS))


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
            await apply_manual_migrations()
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
