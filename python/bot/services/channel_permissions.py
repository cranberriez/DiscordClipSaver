from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

import aiohttp

logger = logging.getLogger(__name__)

DISCORD_API_BASE = "https://discord.com/api/v10"
ADMINISTRATOR = 1 << 3
VIEW_CHANNEL = 1 << 10
ALL_PERMISSIONS = (1 << 64) - 1

GUILD_REVISION_KEY = "permissions:guild-revision:{guild_id}"
MEMBER_REVISION_KEY = "permissions:member-revision:{guild_id}:{user_id}"
ACCESS_CACHE_KEY = (
    "permissions:channel-access:{guild_id}:{user_id}:{guild_revision}:{member_revision}"
)
GUILD_DATA_CACHE_KEY = "permissions:guild-data:{guild_id}:{guild_revision}"
MEMBER_DATA_CACHE_KEY = (
    "permissions:member-data:{guild_id}:{user_id}:{member_revision}"
)

_redis_client: Optional[Any] = None


class DiscordPermissionLookupError(RuntimeError):
    def __init__(self, status_code: int, detail: Any):
        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail


@dataclass(frozen=True)
class ChannelAccessResult:
    guild_id: str
    user_id: str
    channel_ids: list[str]
    is_member: bool
    is_administrator: bool
    source: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "guild_id": self.guild_id,
            "user_id": self.user_id,
            "channel_ids": self.channel_ids,
            "is_member": self.is_member,
            "is_administrator": self.is_administrator,
            "source": self.source,
        }


def set_permission_redis_client(redis_client: Optional[Any]) -> None:
    global _redis_client
    _redis_client = redis_client


def _cache_ttl_seconds() -> int:
    return max(30, int(os.getenv("DISCORD_PERMISSION_CACHE_TTL_SECONDS", "300")))


async def _get_redis() -> Optional[Any]:
    if _redis_client is None:
        return None

    try:
        await _redis_client.ensure_connected()
        return _redis_client.client
    except Exception:
        logger.warning("Permission cache Redis unavailable", exc_info=True)
        return None


async def _get_revisions(guild_id: str, user_id: str) -> tuple[int, int]:
    redis = await _get_redis()
    if redis is None:
        return 0, 0

    values = await redis.mget(
        GUILD_REVISION_KEY.format(guild_id=guild_id),
        MEMBER_REVISION_KEY.format(guild_id=guild_id, user_id=user_id),
    )
    return int(values[0] or 0), int(values[1] or 0)


async def invalidate_guild_permissions(guild_id: str) -> None:
    """Invalidate every cached member decision affected by roles/overwrites."""
    redis = await _get_redis()
    if redis is not None:
        try:
            await redis.incr(GUILD_REVISION_KEY.format(guild_id=str(guild_id)))
        except Exception:
            logger.warning("Failed to invalidate guild permission cache", exc_info=True)


async def invalidate_member_permissions(guild_id: str, user_id: str) -> None:
    """Invalidate one member after their assigned roles or membership changes."""
    redis = await _get_redis()
    if redis is not None:
        try:
            await redis.incr(
                MEMBER_REVISION_KEY.format(
                    guild_id=str(guild_id), user_id=str(user_id)
                )
            )
        except Exception:
            logger.warning("Failed to invalidate member permission cache", exc_info=True)


def _parse_permissions(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def compute_base_permissions(
    guild_id: str,
    guild_owner_id: str,
    user_id: str,
    member_role_ids: set[str],
    roles: list[dict[str, Any]],
) -> int:
    """Follow Discord's documented guild-level permission algorithm."""
    if user_id == guild_owner_id:
        return ALL_PERMISSIONS

    permissions = 0
    for role in roles:
        role_id = str(role.get("id", ""))
        if role_id == guild_id or role_id in member_role_ids:
            permissions |= _parse_permissions(role.get("permissions"))

    if permissions & ADMINISTRATOR:
        return ALL_PERMISSIONS
    return permissions


def compute_channel_permissions(
    base_permissions: int,
    guild_id: str,
    user_id: str,
    member_role_ids: set[str],
    overwrites: list[dict[str, Any]],
) -> int:
    """Apply @everyone, combined role, then member-specific overwrites."""
    if base_permissions & ADMINISTRATOR:
        return ALL_PERMISSIONS

    permissions = base_permissions

    everyone = next(
        (
            overwrite
            for overwrite in overwrites
            if str(overwrite.get("id", "")) == guild_id
            and int(overwrite.get("type", -1)) == 0
        ),
        None,
    )
    if everyone:
        permissions &= ~_parse_permissions(everyone.get("deny"))
        permissions |= _parse_permissions(everyone.get("allow"))

    allow = 0
    deny = 0
    for overwrite in overwrites:
        overwrite_id = str(overwrite.get("id", ""))
        if int(overwrite.get("type", -1)) == 0 and overwrite_id in member_role_ids:
            allow |= _parse_permissions(overwrite.get("allow"))
            deny |= _parse_permissions(overwrite.get("deny"))
    permissions &= ~deny
    permissions |= allow

    member = next(
        (
            overwrite
            for overwrite in overwrites
            if str(overwrite.get("id", "")) == user_id
            and int(overwrite.get("type", -1)) == 1
        ),
        None,
    )
    if member:
        permissions &= ~_parse_permissions(member.get("deny"))
        permissions |= _parse_permissions(member.get("allow"))

    return permissions


def compute_visible_channel_ids(
    guild: dict[str, Any],
    member: dict[str, Any],
    roles: list[dict[str, Any]],
    channels: list[dict[str, Any]],
    user_id: str,
) -> tuple[list[str], bool]:
    guild_id = str(guild["id"])
    member_role_ids = {str(role_id) for role_id in member.get("roles", [])}
    base_permissions = compute_base_permissions(
        guild_id=guild_id,
        guild_owner_id=str(guild.get("owner_id", "")),
        user_id=user_id,
        member_role_ids=member_role_ids,
        roles=roles,
    )
    is_administrator = bool(base_permissions & ADMINISTRATOR)

    visible = []
    for channel in channels:
        permissions = compute_channel_permissions(
            base_permissions=base_permissions,
            guild_id=guild_id,
            user_id=user_id,
            member_role_ids=member_role_ids,
            overwrites=channel.get("permission_overwrites", []),
        )
        if permissions & VIEW_CHANNEL:
            visible.append(str(channel["id"]))

    return visible, is_administrator


async def _discord_get(
    session: aiohttp.ClientSession, path: str, *, member_lookup: bool = False
) -> Optional[Any]:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise DiscordPermissionLookupError(
            503,
            {
                "error_type": "DISCORD_REST_UNAVAILABLE",
                "message": "BOT_TOKEN is not configured",
            },
        )

    async with session.get(
        f"{DISCORD_API_BASE}{path}",
        headers={"Authorization": f"Bot {token}"},
    ) as response:
        if member_lookup and response.status == 404:
            return None
        if response.status == 401:
            raise DiscordPermissionLookupError(503, "Discord rejected BOT_TOKEN")
        if response.status in {403, 404}:
            raise DiscordPermissionLookupError(
                502,
                "Bot cannot read the requested Discord permission data",
            )
        if response.status == 429:
            raise DiscordPermissionLookupError(
                503, "Discord permission lookup rate limited"
            )
        if response.status >= 400:
            detail = (await response.text())[:200]
            raise DiscordPermissionLookupError(
                502,
                f"Discord permission lookup failed ({response.status}): {detail}",
            )
        return await response.json()


async def _fetch_permission_data(
    guild_id: str,
    user_id: str,
    guild_revision: int,
    member_revision: int,
    redis: Optional[Any],
) -> tuple[dict[str, Any], Optional[dict[str, Any]], list[dict], list[dict]]:
    guild_cache_key = GUILD_DATA_CACHE_KEY.format(
        guild_id=guild_id, guild_revision=guild_revision
    )
    member_cache_key = MEMBER_DATA_CACHE_KEY.format(
        guild_id=guild_id,
        user_id=user_id,
        member_revision=member_revision,
    )

    guild_data = None
    member_cache = None
    if redis is not None:
        guild_cached, member_cached = await redis.mget(
            guild_cache_key, member_cache_key
        )
        if guild_cached:
            guild_data = json.loads(guild_cached)
        if member_cached:
            member_cache = json.loads(member_cached)

    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        if guild_data is None:
            guild, roles, channels = await asyncio.gather(
                _discord_get(session, f"/guilds/{guild_id}"),
                _discord_get(session, f"/guilds/{guild_id}/roles"),
                _discord_get(session, f"/guilds/{guild_id}/channels"),
            )
            guild_data = {"guild": guild, "roles": roles, "channels": channels}

        if member_cache is None:
            member = await _discord_get(
                session,
                f"/guilds/{guild_id}/members/{user_id}",
                member_lookup=True,
            )
            # Cache negative membership too; invalidation fires on member join.
            member_cache = {"member": member}

    if redis is not None:
        ttl_seconds = _cache_ttl_seconds()
        await asyncio.gather(
            redis.set(guild_cache_key, json.dumps(guild_data), ex=ttl_seconds),
            redis.set(member_cache_key, json.dumps(member_cache), ex=ttl_seconds),
        )

    return (
        guild_data["guild"],
        member_cache["member"],
        guild_data["roles"],
        guild_data["channels"],
    )


async def _fetch_access_from_discord(
    guild_id: str,
    user_id: str,
    guild_revision: int,
    member_revision: int,
    redis: Optional[Any],
) -> ChannelAccessResult:
    guild, member, roles, channels = await _fetch_permission_data(
        guild_id,
        user_id,
        guild_revision,
        member_revision,
        redis,
    )

    if member is None:
        return ChannelAccessResult(
            guild_id=guild_id,
            user_id=user_id,
            channel_ids=[],
            is_member=False,
            is_administrator=False,
            source="discord",
        )

    channel_ids, is_administrator = compute_visible_channel_ids(
        guild=guild,
        member=member,
        roles=roles,
        channels=channels,
        user_id=user_id,
    )
    return ChannelAccessResult(
        guild_id=guild_id,
        user_id=user_id,
        channel_ids=channel_ids,
        is_member=True,
        is_administrator=is_administrator,
        source="discord",
    )


async def resolve_channel_access(guild_id: str, user_id: str) -> ChannelAccessResult:
    """Resolve effective VIEW_CHANNEL access with revisioned, user-scoped caching."""
    guild_revision, member_revision = await _get_revisions(guild_id, user_id)
    redis = await _get_redis()
    cache_key = ACCESS_CACHE_KEY.format(
        guild_id=guild_id,
        user_id=user_id,
        guild_revision=guild_revision,
        member_revision=member_revision,
    )

    if redis is not None:
        cached = await redis.get(cache_key)
        if cached:
            payload = json.loads(cached)
            return ChannelAccessResult(
                guild_id=payload["guild_id"],
                user_id=payload["user_id"],
                channel_ids=payload["channel_ids"],
                is_member=payload["is_member"],
                is_administrator=payload["is_administrator"],
                source="cache",
            )

    result = await _fetch_access_from_discord(
        guild_id,
        user_id,
        guild_revision,
        member_revision,
        redis,
    )

    if redis is not None:
        # Do not publish under an old revision if an invalidation raced this fetch.
        current_revisions = await _get_revisions(guild_id, user_id)
        if current_revisions == (guild_revision, member_revision):
            await redis.set(
                cache_key,
                json.dumps(result.to_dict()),
                ex=_cache_ttl_seconds(),
            )

    return result
