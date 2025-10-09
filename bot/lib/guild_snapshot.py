from __future__ import annotations

from typing import Optional

import discord

from db.types import ChannelSnapshot, GuildSnapshot


def build_guild_snapshot(guild: discord.Guild) -> GuildSnapshot:
    """Build a `GuildSnapshot` from a `discord.Guild`.

    Note: `guild.icon` may be None or an Asset depending on discord.py version.
    We persist whatever the caller is already using elsewhere to keep behavior consistent.
    """
    channel_summaries: list[ChannelSnapshot] = []
    for channel in guild.channels:
        channel_summaries.append(
            ChannelSnapshot(
                id=str(channel.id),
                name=getattr(channel, "name", str(channel)),
                type=channel.__class__.__name__,
            )
        )

    joined_at: Optional[object] = None
    if hasattr(guild, "me") and guild.me is not None:
        joined_at = getattr(guild.me, "joined_at", None)

    snapshot = GuildSnapshot(
        id=str(guild.id),
        name=guild.name,
        icon=guild.icon,  # keep as-is to match existing persistence behavior
        joined_at=joined_at,  # may be None
        channels=tuple(channel_summaries),
    )
    return snapshot
