"""
Author-related database operations
"""
import logging
from typing import Optional, Set

from shared.db.models import Author, User
from shared.time import utcnow

logger = logging.getLogger(__name__)


async def get_author_ids_by_guild_id(guild_id: str) -> Set[str]:
    """
    Fetch all author user IDs for a given guild.

    Args:
        guild_id: The ID of the guild.

    Returns:
        A set of user IDs (as strings) for all authors in the guild.
    """
    author_ids = await Author.filter(guild_id=guild_id).values_list('user_id', flat=True)
    return set(author_ids)


async def update_global_profile(
    user_id: str,
    username: str,
    discriminator: str,
    avatar_url: Optional[str],
    display_name: str,
    previous_display_avatar_url: Optional[str] = None,
) -> int:
    """Update a user's global profile and remove the legacy fallback avatar value."""
    now = utcnow()
    updated = await Author.filter(user_id=user_id).update(
        username=username,
        discriminator=discriminator,
        avatar_url=avatar_url,
        display_name=display_name,
        updated_at=now,
    )

    # Older ingestion code wrote display_avatar into guild_avatar_url. Clear only
    # rows matching the prior fallback URL so real guild avatars are preserved.
    if previous_display_avatar_url:
        await Author.filter(
            user_id=user_id,
            guild_avatar_url=previous_display_avatar_url,
        ).update(guild_avatar_url=None, updated_at=now)

    await User.filter(id=user_id).update(
        username=username,
        discriminator=discriminator,
        avatar_url=avatar_url,
        updated_at=now,
    )
    return updated


async def update_member_profile(user_id: str, guild_id: str, profile: dict) -> int:
    """Update an existing guild-specific Author profile."""
    return await Author.filter(user_id=user_id, guild_id=guild_id).update(
        **profile,
        updated_at=utcnow(),
    )
