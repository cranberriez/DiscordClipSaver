import discord
from bot.services.container import guild_service, channel_service
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
async def on_guild_channel_create(channel: discord.ChannelType):
    await channel_service.on_channel_crup(channel.guild)


@bot.event
async def on_guild_channel_update(channel: discord.ChannelType):
    await channel_service.on_channel_crup(channel.guild)


@bot.event
async def on_guild_channel_delete(channel: discord.ChannelType):
    await channel_service.on_channel_delete(channel.guild)


# --- Message Events ---
@bot.event
async def on_message(message: discord.Message):
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return
    # Dev visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)

    # TODO: Handle messages from previously unknown channels, fetch single channel and add
