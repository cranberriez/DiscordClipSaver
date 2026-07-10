from __future__ import annotations

import discord

from bot.logger import logger
from shared.author_profile import build_global_profile, build_member_profile
from shared.db.repositories.authors import (
    get_author_ids_by_guild_id,
    update_global_profile,
    update_member_profile,
)
from shared.db.repositories.bulk_operations import bulk_upsert_authors


def _display_avatar_url(user: discord.User) -> str | None:
    avatar = getattr(user, "display_avatar", None)
    return str(avatar.url) if avatar else None


class AuthorService:
    """Keeps persisted clip-author profiles synchronized with Discord."""

    def __init__(self) -> None:
        self._initial_sync_complete = False

    async def sync_existing_authors(self, client: discord.Client) -> None:
        """Refresh existing authors from the member cache after gateway startup."""
        if self._initial_sync_complete:
            return

        refreshed = 0
        missing = 0

        for guild in client.guilds:
            author_ids = await get_author_ids_by_guild_id(str(guild.id))
            authors_data = []
            for user_id in author_ids:
                member = guild.get_member(int(user_id))
                if member is None:
                    missing += 1
                    continue
                authors_data.append(
                    {
                        "user_id": user_id,
                        "guild_id": str(guild.id),
                        **build_member_profile(member),
                    }
                )

            success_count, _ = await bulk_upsert_authors(authors_data)
            refreshed += success_count

        self._initial_sync_complete = True
        logger.info(
            "Refreshed %d existing author profile(s); %d missing from member cache",
            refreshed,
            missing,
        )

    async def on_user_update(
        self,
        before: discord.User,
        after: discord.User,
    ) -> None:
        """Persist a global Discord profile change across author records."""
        profile = build_global_profile(after)
        await update_global_profile(
            user_id=str(after.id),
            display_name=getattr(after, "global_name", None) or after.name,
            previous_display_avatar_url=_display_avatar_url(before),
            **profile,
        )

    async def on_member_update(self, member: discord.Member) -> None:
        """Persist nickname, display-name, and guild-avatar changes."""
        await update_member_profile(
            user_id=str(member.id),
            guild_id=str(member.guild.id),
            profile=build_member_profile(member),
        )
