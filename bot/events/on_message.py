from __future__ import annotations

import discord

from logger import logger


async def handle_on_message(bot: discord.Client, message: discord.Message) -> None:
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return

    # Basic log for visibility (dev)
    logger.info("[%s] %s: %s", message.id, message.author, message.content)
