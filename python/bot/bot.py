import discord
from bot.services.container import guild_service, channel_service
from bot.services.scan_service import get_scan_service
from bot.logger import logger

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)


# --- Bot Events ---
@bot.event
async def on_ready():
    await guild_service.sync_guilds(bot)
    
    for guild in bot.guilds:
        await channel_service.sync_channels(bot, guild)
    
    # Detect gaps and queue catch-up scans
    scan_service = get_scan_service()
    await scan_service.detect_and_queue_gaps(bot)


# --- Guild Events ---
@bot.event
async def on_guild_join(guild: discord.Guild):
    await guild_service.on_guild_join(guild)
    await channel_service.sync_channels(bot, guild)


@bot.event
async def on_guild_update(guild: discord.Guild):
    await guild_service.on_guild_update(guild)


@bot.event
async def on_guild_remove(guild: discord.Guild):
    await guild_service.on_guild_remove(guild)
    await channel_service.remove_channels(guild)


# --- Channel Events ---
@bot.event
async def on_guild_channel_create(channel: discord.abc.GuildChannel):
    await channel_service.on_channel_crup(channel.guild, channel)


@bot.event
async def on_guild_channel_update(before: discord.abc.GuildChannel, after: discord.abc.GuildChannel):
    await channel_service.on_channel_crup(after.guild, after)


@bot.event
async def on_guild_channel_delete(channel: discord.abc.GuildChannel):
    await channel_service.on_channel_delete(channel.guild, channel)


# --- User Events ---

# TODO: Handle users' joining guilds, leaving guilds, and updating user details (like image and username aka nickname) 


# --- Message Events ---
@bot.event
async def on_message(message: discord.Message):
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return
    # Dev visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)
    
    # Handle message scanning (lightweight - just checks for attachments and queues job)
    scan_service = get_scan_service()
    await scan_service.handle_new_message(message)
    
    # TODO: Handle messages from previously unknown channels, fetch single channel and add
    # TODO: Handle messages from unknown guilds, fetch single guild and add
