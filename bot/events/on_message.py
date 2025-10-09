from __future__ import annotations

import discord

from api import MESSAGES, StoredMessage
from logger import logger


async def handle_on_message(bot: discord.Client, message: discord.Message) -> None:
    # Ignore the bot’s own messages
    if message.author.id == bot.user.id:
        return

    # Store (or update) the message content
    MESSAGES[message.id] = StoredMessage(
        id=message.id,
        author_id=message.author.id,
        channel_id=message.channel.id,
        content=message.content or "",
    )

    # Basic log for visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)
