import asyncio
from contextlib import suppress
import os

import uvicorn
from dotenv import load_dotenv


from bot.api import api
from bot.bot import bot as discord_bot
from bot.schedules.scheduler import start_scheduler_and_jobs
from bot.services.scan_service import get_scan_service

from shared.db.utils import init_db, close_db
from shared.redis.redis_client import RedisStreamClient

load_dotenv()

# ----- Run both: API server + Discord bot -----
async def main():
    # Initialize database (async)
    await init_db(generate_schemas=True)
    
    # Initialize Redis client for job queue (bot is a producer, not a consumer)
    redis_client = RedisStreamClient(
        stream_pattern="*",
        consumer_group=None,  # Bot doesn't consume jobs
        consumer_name=None    # Bot only produces jobs
    )
    await redis_client.connect()
    
    # Configure scan service with Redis client
    scan_service = get_scan_service(redis_client=redis_client)
    
    # Start FastAPI (uvicorn) in the background
    config = uvicorn.Config(api, host="0.0.0.0", port=8000, loop="asyncio", log_level="info")
    server = uvicorn.Server(config)

    api_task = asyncio.create_task(server.serve())

    # Start a single scheduler and register all jobs in one place
    scheduler = start_scheduler_and_jobs()

    # Start the Discord bot (replace with your token)
    TOKEN = os.getenv("BOT_TOKEN")
    if not TOKEN:
        raise RuntimeError("BOT_TOKEN not set in environment")
    bot_task = asyncio.create_task(discord_bot.start(TOKEN))

    try:
        await bot_task
    except (asyncio.CancelledError, KeyboardInterrupt):
        bot_task.cancel()
        with suppress(asyncio.CancelledError):
            await bot_task
    finally:
        # Stop scheduler
        with suppress(Exception):
            scheduler.shutdown(wait=False)
        if not discord_bot.is_closed():
            await discord_bot.close()

        # If the bot stops, also stop the API server
        if not server.should_exit:
            server.should_exit = True

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
