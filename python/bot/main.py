import asyncio
from contextlib import suppress
import os
import logging

import uvicorn
from dotenv import load_dotenv


from bot.api import api, set_redis_client
from bot.schedules.scheduler import start_scheduler_and_jobs

from shared.db.utils import get_env_bool, init_db, close_db
from shared.redis.redis_client import RedisStreamClient
from shared.settings_loader import initialize_settings

logger = logging.getLogger(__name__)

load_dotenv()

BOT_RUNTIME_MODES = {"all", "api", "discord"}


def get_bot_runtime_mode() -> str:
    mode = os.getenv("BOT_RUNTIME_MODE", "all").strip().lower()
    if mode not in BOT_RUNTIME_MODES:
        allowed = ", ".join(sorted(BOT_RUNTIME_MODES))
        raise RuntimeError(f"BOT_RUNTIME_MODE must be one of: {allowed}")
    return mode


# ----- Run API server, Discord bot, or both -----
async def main():
    runtime_mode = get_bot_runtime_mode()
    start_api = runtime_mode in {"all", "api"}
    start_discord = runtime_mode in {"all", "discord"}

    # Initialize settings first (must be done before anything else)
    initialize_settings()
    
    # Initialize database (async). Schema creation is handled by the db-schema
    # one-shot service; DB_GENERATE_SCHEMAS remains as a standalone/dev escape hatch.
    generate_schemas = get_env_bool("DB_GENERATE_SCHEMAS", default=False)
    if generate_schemas:
        logger.warning("DB_GENERATE_SCHEMAS=true; bot startup will generate schemas")
    await init_db(generate_schemas=generate_schemas)
    
    # Initialize Redis client for job queue (bot is a producer, not a consumer)
    redis_client = RedisStreamClient(
        stream_pattern="*",
        consumer_group=None,  # Bot doesn't consume jobs
        consumer_name=None    # Bot only produces jobs
    )
    try:
        # Redis is required for the gateway listener to queue live work. API-only
        # mode uses Redis only for best-effort cleanup jobs, so keep startup fast.
        await redis_client.connect(max_attempts=None if start_discord else 1)
    except Exception as e:
        log = logger.error if start_discord else logger.warning
        log(f"Initial Redis connection failed; bot will keep running and retry on demand. Error: {e}")

    set_redis_client(redis_client)

    message_batcher = None
    if start_discord:
        from bot.services.scan_service import get_scan_service
        from bot.services.message_batcher import get_message_batcher

        # Configure scan service with Redis client
        get_scan_service(redis_client=redis_client)

        # Configure message batcher with Redis client
        message_batcher = get_message_batcher(redis_client=redis_client)

    token = None
    if start_discord:
        token = os.getenv("BOT_TOKEN")
        if not token:
            raise RuntimeError("BOT_TOKEN not set in environment")

    discord_bot = None
    if start_discord:
        from bot.bot import bot as discord_bot

    server = None
    api_task = None
    if start_api:
        # Start FastAPI (uvicorn) in the background
        config = uvicorn.Config(api, host="0.0.0.0", port=8000, loop="asyncio", log_level="info")
        server = uvicorn.Server(config)
        api_task = asyncio.create_task(server.serve())

    scheduler = None
    if start_api:
        # Start API-owned scheduled maintenance jobs.
        scheduler = start_scheduler_and_jobs()

    bot_task = None
    if start_discord:
        # Start the Discord bot
        bot_task = asyncio.create_task(discord_bot.start(token))

    try:
        if bot_task:
            await bot_task
        elif api_task:
            await api_task
    except (asyncio.CancelledError, KeyboardInterrupt):
        if bot_task:
            bot_task.cancel()
            with suppress(asyncio.CancelledError):
                await bot_task
        if api_task:
            api_task.cancel()
            with suppress(asyncio.CancelledError):
                await api_task
    finally:
        # Stop scheduler
        if scheduler:
            scheduler.shutdown(wait=False)
        if start_discord and not discord_bot.is_closed():
            await discord_bot.close()

        # Stop message batcher and process remaining batches
        if message_batcher:
            with suppress(Exception):
                await message_batcher.stop()

        # If the bot stops, also stop the API server
        if server and not server.should_exit:
            server.should_exit = True

        if api_task:
            with suppress(asyncio.CancelledError):
                await api_task
        
        # Disconnect Redis
        with suppress(Exception):
            await redis_client.disconnect()

        # Close database connections
        with suppress(Exception):
            await close_db()

if __name__ == "__main__":
    try:
        # On Windows, psycopg async requires a SelectorEventLoop.
        # Switch the event loop policy before creating the loop.
        if os.name == "nt":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
