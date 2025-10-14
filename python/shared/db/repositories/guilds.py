from __future__ import annotations

from typing import Iterable, Any, Optional

from tortoise.expressions import Q

from shared.db.models import Guild
from datetime import datetime


async def upsert_guilds(snapshots: Iterable[Any]) -> None:
    """Insert or update guilds from snapshot objects.

    Each snapshot should have attributes: id (str), name (str), and optional icon (str|None).
    """
    for s in snapshots:
        gid = getattr(s, "id")
        name = getattr(s, "name")
        icon = getattr(s, "icon", None)
        # get_or_create then update on existing
        obj, created = await Guild.get_or_create(
            id=str(gid),
            defaults={
                "name": name,
                "icon_url": icon.url if icon else None,
            },
        )
        if not created:

            # Update changed fields
            update_needed = False
            if obj.name != name:
                obj.name = name
                update_needed = True
            if obj.icon_url != (icon.url if icon else None):
                obj.icon_url = icon.url if icon else None
                update_needed = True
            if obj.deleted_at is not None:
                obj.deleted_at = None
                update_needed = True
            if update_needed:
                await obj.save()


async def delete_guilds(guild_ids: Iterable[str]) -> int:
    """Delete guilds by id. Returns number of rows deleted."""
    ids = [str(gid) for gid in guild_ids]
    return await Guild.filter(id__in=ids).update(deleted_at=datetime.now())

async def delete_single_guild(guild_id: str) -> int:
    return await Guild.filter(id=str(guild_id)).update(deleted_at=datetime.now())

async def get_guilds() -> List[Guild]:
    return await Guild.filter().order_by("name", "id")
