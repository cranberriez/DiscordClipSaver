# app.py  (Python 3.10+)
# pip install discord.py fastapi uvicorn[standard]

import asyncio
from contextlib import suppress
import os
import sys

import uvicorn
from dotenv import load_dotenv

from api import api
from bot import bot
from db import database
from schedules import start_scheduler_and_jobs

load_dotenv()
database.configure_from_env()

# ----- Run both: API server + Discord bot -----
async def main():
    # Initialize database (async)
    await database.init_db()
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
    bot_task = asyncio.create_task(bot.start(TOKEN))

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
        if not bot.is_closed():
            await bot.close()

        # If the bot stops, also stop the API server
        if not server.should_exit:
            server.should_exit = True

        with suppress(asyncio.CancelledError):
            await api_task

if __name__ == "__main__":
    try:
        # On Windows, psycopg async requires a SelectorEventLoop.
        # Switch the event loop policy before creating the loop.
        if os.name == "nt":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
