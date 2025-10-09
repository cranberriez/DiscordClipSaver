from __future__ import annotations

import discord

import db.database as db
from logger import logger


async def handle_on_guild_remove(bot: discord.Client, guild: discord.Guild) -> None:
    """Handle when the bot is removed from a guild (kicked or the guild is deleted)."""
    guild_id_str = str(guild.id)

    # Remove from persistence and in-memory cache
    await db.delete_guilds([guild_id_str])
    if guild_id_str in bot.available_guilds:
        del bot.available_guilds[guild_id_str]

    logger.info("Removed from guild: %s (%s)", guild.name, guild.id)
