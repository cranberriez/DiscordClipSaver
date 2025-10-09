from __future__ import annotations

import discord

import db.database as db
from lib.guild_gather_update import gather_accessible_guilds_and_channels
from lib.apply_default_settings import apply_default_settings_for_guilds
from logger import logger


async def handle_on_ready(bot: discord.Client) -> None:
    logger.info("Logged in as %s (id=%s)", bot.user, bot.user.id)

    guild_snapshots = await gather_accessible_guilds_and_channels(bot)
    db.upsert_guilds(guild_snapshots)
    apply_default_settings_for_guilds(guild_snapshots)
