"""
Author-related database operations
"""
import logging
from typing import List, Set

from shared.db.models import Author

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
