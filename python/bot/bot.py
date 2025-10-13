import discord
from bot.services.container import guild_service, channel_service
from bot.logger import logger

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)

@bot.event
async def on_ready():
    await guild_service.sync_guilds(bot)
    
    for guild in bot.guilds:
        await channel_service.sync_channels(bot, guild)


@bot.event
async def on_guild_join(guild: discord.Guild):
    await guild_service.on_guild_join(bot, guild)
    # TODO: Sync channels


@bot.event
async def on_guild_remove(guild: discord.Guild):
    await guild_service.on_guild_remove(bot, guild)
    # TODO: REMOVE related channels


@bot.event
async def on_message(message: discord.Message):
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return
    # Dev visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)

    # TODO: Handle messages from previously unknown channels, fetch single channel and add

# TODO: Sync Channels on Channel Add, Update, Remove