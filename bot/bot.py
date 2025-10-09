import discord

from api import MESSAGES, StoredMessage
from logger import logger
from lib.guild_gather_update import gather_accessible_guilds_and_channels
import db.database as db
from lib.apply_default_settings import apply_default_settings_for_guilds
from db.types import ChannelSnapshot, GuildSnapshot

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
async def on_guild_join(guild: discord.Guild):
    """Handle when the bot is invited to a new guild."""
    # Build a snapshot for the single guild
    channel_summaries: list[ChannelSnapshot] = []
    for channel in guild.channels:
        channel_summaries.append(
            ChannelSnapshot(
                id=str(channel.id),
                name=getattr(channel, "name", str(channel)),
                type=channel.__class__.__name__,
            )
        )

    joined_at = None
    if hasattr(guild, "me") and guild.me is not None:
        joined_at = getattr(guild.me, "joined_at", None)

    snapshot = GuildSnapshot(
        id=str(guild.id),
        name=guild.name,
        joined_at=joined_at,
        channels=tuple(channel_summaries),
    )

    bot.available_guilds[str(guild.id)] = snapshot
    db.upsert_guilds([snapshot])
    apply_default_settings_for_guilds([snapshot])
    logger.info("Joined guild: %s (%s)", guild.name, guild.id)


@bot.event
async def on_guild_remove(guild: discord.Guild):
    """Handle when the bot is removed from a guild (kicked or the guild is deleted)."""
    guild_id_str = str(guild.id)
    # Remove from persistence and in-memory cache
    db.delete_guilds([guild_id_str])
    if guild_id_str in bot.available_guilds:
        del bot.available_guilds[guild_id_str]
    logger.info("Removed from guild: %s (%s)", guild.name, guild.id)


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

# TODO: Additional sync logic (if needed) for more complex guild updates