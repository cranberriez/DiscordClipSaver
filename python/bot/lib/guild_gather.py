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

    return snapshots
