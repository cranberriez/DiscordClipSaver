"""
Discord bot instance for worker operations
"""
import os
import logging
import discord
from discord.ext import commands
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class WorkerBot(commands.Bot):
    """Custom Discord Bot class for the worker."""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.members = True
        super().__init__(command_prefix="!", intents=intents)

        self.ready_event = asyncio.Event()
        self.start_time = datetime.now(timezone.utc)

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Discord bot logged in as {self.user}")
        self.ready_event.set()

    async def start_bot(self):
        """Starts the bot with the token from environment variables."""
        token = os.getenv("BOT_TOKEN")
        if not token:
            raise ValueError("BOT_TOKEN environment variable not set")
        logger.info("Starting Discord bot...")
        await self.start(token)

    async def stop_bot(self):
        """Stops the bot."""
        logger.info("Stopping Discord bot...")
        await self.close()