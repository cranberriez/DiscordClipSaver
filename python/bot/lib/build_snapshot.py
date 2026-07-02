from __future__ import annotations

from typing import Optional

import discord

from bot.lib.types import ChannelSnapshot, GuildSnapshot


def build_guild_snapshot(guild: discord.Guild) -> GuildSnapshot:
    """Build a `GuildSnapshot` from a `discord.Guild`.

    Note: `guild.icon` may be None or an Asset depending on discord.py version.
    We persist whatever the caller is already using elsewhere to keep behavior consistent.
    """

    joined_at: Optional[object] = None
    if hasattr(guild, "me") and guild.me is not None:
        joined_at = getattr(guild.me, "joined_at", None)

    # Normalize icon to a string (URL) or None
    icon_value = None
    try:
        if getattr(guild, "icon", None):
            icon_attr = guild.icon
            # discord.py v2+: Asset has .url
            icon_value = getattr(icon_attr, "url", None) or str(icon_attr)
    except Exception:
        icon_value = None

    snapshot = GuildSnapshot(
        id=str(guild.id),
        name=guild.name,
        icon=icon_value,
        joined_at=joined_at  # may be None
    )
    return snapshot

def build_channel_snapshot(channel: discord.abc.GuildChannel) -> ChannelSnapshot:
    """Build a `ChannelSnapshot` from a single Discord channel."""
    channel_type = getattr(channel, "type", None)
    type_value = getattr(channel_type, "name", None) or str(channel_type or "0")

    # Access control: can @everyone view this channel? Private/role-gated
    # channels resolve to False and their clips are hidden from regular
    # members in the interface (unless the owner overrides to "visible").
    everyone_can_view = True
    try:
        guild = getattr(channel, "guild", None)
        default_role = getattr(guild, "default_role", None)
        if default_role is not None:
            perms = channel.permissions_for(default_role)
            everyone_can_view = bool(perms.view_channel)
    except Exception:
        # Fail open (visible) rather than hiding clips on a permission
        # calculation error; sync will correct it next pass.
        everyone_can_view = True

    return ChannelSnapshot(
        id=str(getattr(channel, "id", "")),
        name=getattr(channel, "name", "unknown"),
        type=type_value,
        is_nsfw=getattr(channel, "nsfw", False),
        everyone_can_view=everyone_can_view
    )