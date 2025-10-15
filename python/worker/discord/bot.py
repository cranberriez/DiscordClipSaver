"""
Discord bot instance for worker operations
"""
import os
import logging
import discord
from discord.ext import commands

logger = logging.getLogger(__name__)


class WorkerBot:
    """Discord bot instance for fetching messages and channels"""
    
    def __init__(self):
        self.bot = None
        self.ready = False
    
    async def start(self):
        """Initialize and login the bot"""
        token = os.getenv("BOT_TOKEN")
        if not token:
            raise ValueError("BOT_TOKEN environment variable not set")
        
        # Create bot with minimal intents (we only need to fetch messages)
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        
        self.bot = commands.Bot(command_prefix="!", intents=intents)
        
        @self.bot.event
        async def on_ready():
            self.ready = True
            logger.info(f"Discord bot logged in as {self.bot.user}")
        
        # Start bot in background (non-blocking)
        logger.info("Starting Discord bot...")
        await self.bot.login(token)
        await self.bot.connect(reconnect=True)
    
    async def stop(self):
        """Shutdown the bot"""
        if self.bot:
            await self.bot.close()
            self.ready = False
            logger.info("Discord bot stopped")
    
    async def wait_until_ready(self):
        """Wait for bot to be ready"""
        if self.bot:
            await self.bot.wait_until_ready()
    
    def get_client(self) -> discord.Client:
        """Get the underlying discord client"""
        return self.bot
    
    async def fetch_channel(self, channel_id: int) -> discord.TextChannel:
        """Fetch a channel by ID"""
        if not self.ready:
            await self.wait_until_ready()
        return await self.bot.fetch_channel(channel_id)
    
    async def fetch_message(self, channel_id: int, message_id: int) -> discord.Message:
        """Fetch a specific message"""
        channel = await self.fetch_channel(channel_id)
        return await channel.fetch_message(message_id)