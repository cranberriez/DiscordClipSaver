from typing import Iterable

from discord import Client

from db.types import ChannelSnapshot, GuildSnapshot
from logger import logger


async def gather_accessible_guilds_and_channels(bot: Client) -> Iterable[GuildSnapshot]:
    """Capture the guild/channel snapshot for the current bot session."""

    snapshots: list[GuildSnapshot] = []

    for guild in bot.guilds:
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
            icon=guild.icon,
            joined_at=joined_at,
            channels=tuple(channel_summaries),
        )
        snapshots.append(snapshot)

    bot.available_guilds = {snap.id: snap for snap in snapshots}

    if snapshots:
        guild_names = ", ".join(snapshot.name for snapshot in snapshots)
        logger.info("Accessible guilds: %s", guild_names)
    else:
        logger.info("No accessible guilds found for the bot.")

    return snapshots
