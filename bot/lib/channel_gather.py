from typing import Iterable

from discord import Client, Guild

from db.types import ChannelSnapshot
from .build_snapshot import build_channel_snapshot


async def gather_channels(bot: Client, guild: Guild) -> Iterable[ChannelSnapshot]:
    """Capture the guild/channel snapshot for the current bot session."""

    snapshots: list[ChannelSnapshot] = []

    for channel in guild.channels:
        print(channel.name)
        snapshot = build_channel_snapshot(channel)
        snapshots.append(snapshot)

    return snapshots