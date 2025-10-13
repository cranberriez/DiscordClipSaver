from __future__ import annotations

from typing import Iterable, Any, List

from tortoise.expressions import Q

from shared.db.models import Channel, Guild, ChannelType


def _to_channel_type(value: str) -> ChannelType:
    try:
        return ChannelType(value)
    except Exception:
        return ChannelType.TEXT


async def upsert_channels_for_guild(guild_id: str, snapshots: Iterable[Any]) -> None:
    """Batch upsert channel rows for a guild.

    Each snapshot should have: id (str), name (str), type (str), is_nsfw (bool).
    """
    # Ensure guild exists (will raise if missing). Caller should have created guilds first.
    guild = await Guild.get(id=str(guild_id))

    for s in snapshots:
        cid = str(getattr(s, "id"))
        name = getattr(s, "name")
        typ = _to_channel_type(getattr(s, "type"))
        nsfw = bool(getattr(s, "is_nsfw", False))

        obj, created = await Channel.get_or_create(
            id=cid,
            defaults={
                "guild": guild,
                "name": name,
                "type": typ,
                "nsfw": nsfw,
            },
        )
        if not created:
            # Unsoft delete
            obj.deleted_at = None

            update_needed = False
            if obj.guild_id != guild.id:
                obj.guild = guild
                update_needed = True
            if obj.name != name:
                obj.name = name
                update_needed = True
            if obj.type != typ:
                obj.type = typ
                update_needed = True
            if obj.nsfw != nsfw:
                obj.nsfw = nsfw
                update_needed = True
            if obj.deleted_at is not None:
                obj.deleted_at = None
                update_needed = True
            if update_needed:
                await obj.save()


async def delete_channels(guild_id: str, channel_ids: Iterable[str]) -> int:
    """Delete channels by IDs. Returns number of rows deleted."""
    ids = [str(cid) for cid in channel_ids]
    return await Channel.filter(guild_id=str(guild_id), id__in=ids).update(deleted_at=datetime.now())


async def delete_single_channel(guild_id: str, channel_id: str) -> int:
    return await Channel.filter(guild_id=str(guild_id), id=str(channel_id)).update(deleted_at=datetime.now())


async def get_channels_by_guild(guild_id: str) -> List[Channel]:
    return await Channel.filter(guild_id=str(guild_id)).order_by("name", "id")
