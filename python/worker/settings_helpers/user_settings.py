"""
User settings helper functions for worker operations.

This module provides utility functions for fetching and processing user settings
to avoid code duplication across worker components.
"""

import logging
from typing import Dict, Any, Optional, Tuple
from shared.user_settings_resolver import resolve_user_settings

logger = logging.getLogger(__name__)


async def get_default_visibility(guild_id: str, channel_id: str) -> str:
    """
    Get the default visibility setting for clips in a channel.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        Database visibility format ('PUBLIC', 'UNLISTED', 'PRIVATE')
    """
    default_visibility = "PUBLIC"  # fallback
    
    try:
        user_settings, _ = await resolve_user_settings(guild_id, channel_id)
        if user_settings and 'default_visibility' in user_settings:
            # Convert from interface format to database format
            visibility_map = {
                'public': 'PUBLIC',
                'unlisted': 'UNLISTED', 
                'private': 'PRIVATE'
            }
            default_visibility = visibility_map.get(user_settings['default_visibility'], 'PUBLIC')
    except Exception as e:
        logger.warning(f"Failed to fetch user settings for {guild_id}:{channel_id}: {e}")
    
    return default_visibility


async def get_user_settings_with_fallback(guild_id: str, channel_id: str) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    Get user settings with fallback handling.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        Tuple of (user_settings_dict or None, settings_hash)
    """
    try:
        return await resolve_user_settings(guild_id, channel_id)
    except Exception as e:
        logger.warning(f"Failed to fetch user settings for {guild_id}:{channel_id}: {e}")
        return None, ""
