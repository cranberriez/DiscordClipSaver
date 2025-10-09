import discord
from services.state import BotState
from services.container import guild_service
from logger import logger

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)
bot.state = BotState()


@bot.event
async def on_ready():
    await guild_service.sync_guilds(bot)


@bot.event
async def on_guild_join(guild: discord.Guild):
    await guild_service.on_guild_join(bot, guild)


@bot.event
async def on_guild_remove(guild: discord.Guild):
    await guild_service.on_guild_remove(bot, guild)


@bot.event
async def on_message(message: discord.Message):
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return
    # Dev visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)

# TODO: Additional sync logic (if needed) for more complex guild updates