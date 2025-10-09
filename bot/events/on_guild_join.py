from __future__ import annotations

import discord

import db.database as db
from lib.apply_default_settings import apply_default_settings_for_guilds
from lib.guild_snapshot import build_guild_snapshot
from logger import logger


async def handle_on_guild_join(bot: discord.Client, guild: discord.Guild) -> None:
    """Handle when the bot is invited to a new guild."""
    snapshot = build_guild_snapshot(guild)

    # Update in-memory cache and persistence
    bot.available_guilds[str(guild.id)] = snapshot
    await db.upsert_guilds([snapshot])
    await apply_default_settings_for_guilds([snapshot])

    logger.info("Joined guild: %s (%s)", guild.name, guild.id)
