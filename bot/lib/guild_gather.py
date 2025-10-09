from typing import Iterable

from discord import Client

from db.types import GuildSnapshot
from logger import logger
from .build_snapshot import build_guild_snapshot


async def gather_guilds(bot: Client) -> Iterable[GuildSnapshot]:
    """Capture the guild/channel snapshot for the current bot session."""

    snapshots: list[GuildSnapshot] = []

    for guild in bot.guilds:
        snapshot = build_guild_snapshot(guild)
        snapshots.append(snapshot)

    if snapshots:
        guild_names = ", ".join(snapshot.name for snapshot in snapshots)
        logger.info("Accessible guilds: %s", guild_names)
    else:
        logger.info("No accessible guilds found for the bot.")

    return snapshots
