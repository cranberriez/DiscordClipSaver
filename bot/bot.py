import discord

from api import MESSAGES, StoredMessage
from logger import logger
from lib.guild_gather_update import gather_accessible_guilds_and_channels
import db.database as db
from lib.apply_default_settings import apply_default_settings_for_guilds

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)
bot.available_guilds = {}


@bot.event
async def on_ready():
    logger.info("Logged in as %s (id=%s)", bot.user, bot.user.id)
    guild_snapshots = await gather_accessible_guilds_and_channels(bot)
    db.upsert_guilds(guild_snapshots)
    apply_default_settings_for_guilds(guild_snapshots)


@bot.event
async def on_message(message: discord.Message):
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return

    # Store (or update) the message content
    MESSAGES[message.id] = StoredMessage(
        id=message.id,
        author_id=message.author.id,
        channel_id=message.channel.id,
        content=message.content or ""
    )
    # (Very basic "logging" to stdout)
    logger.info("[%s] %s: %s", message.id, message.author, message.content)

# TODO: On guild create/delete for bot sync list of guilds or update guild from event