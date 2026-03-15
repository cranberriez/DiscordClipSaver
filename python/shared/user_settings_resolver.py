"""
User settings resolution with database fallbacks.

This module handles user-modifiable settings that are stored in the database,
with fallbacks to static defaults from the centralized settings loader.
"""

import hashlib
import json
import logging
from typing import Dict, Any, Optional, Tuple
from shared.db.models import GuildSettings, ChannelSettings
from shared.settings_loader import get_user_facing_defaults, get_channel_defaults, get_guild_defaults

logger = logging.getLogger(__name__)


class UserSettingsCache:
    """
    Simple in-memory cache for user settings with hash-based invalidation.
    
    This prevents repeated database queries during batch processing while
    allowing settings to be updated mid-scan if needed.
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._hashes: Dict[str, str] = {}
    
    def get_cache_key(self, guild_id: str, channel_id: str) -> str:
        """Generate cache key for guild+channel combination."""
        return f"{guild_id}:{channel_id}"
    
    def get_cached_settings(self, guild_id: str, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get cached settings if they exist."""
        cache_key = self.get_cache_key(guild_id, channel_id)
        return self._cache.get(cache_key)
    
    def cache_settings(self, guild_id: str, channel_id: str, settings: Dict[str, Any], settings_hash: str) -> None:
        """Cache settings with their hash."""
        cache_key = self.get_cache_key(guild_id, channel_id)
        self._cache[cache_key] = settings.copy()
        self._hashes[cache_key] = settings_hash
    
    def get_cached_hash(self, guild_id: str, channel_id: str) -> Optional[str]:
        """Get cached settings hash."""
        cache_key = self.get_cache_key(guild_id, channel_id)
        return self._hashes.get(cache_key)
    
    def clear_cache(self, guild_id: str, channel_id: Optional[str] = None) -> None:
        """Clear cache for specific guild or guild+channel."""
        if channel_id:
            # Clear specific channel
            cache_key = self.get_cache_key(guild_id, channel_id)
            self._cache.pop(cache_key, None)
            self._hashes.pop(cache_key, None)
        else:
            # Clear all channels for guild
            keys_to_remove = [key for key in self._cache.keys() if key.startswith(f"{guild_id}:")]
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._hashes.pop(key, None)


# Global cache instance
_user_settings_cache = UserSettingsCache()


async def resolve_user_settings(guild_id: str, channel_id: str, use_cache: bool = True) -> Tuple[Dict[str, Any], str]:
    """
    Resolve effective user settings for a channel with database fallbacks.
    
    This combines:
    1. Static bot/system defaults (from centralized settings)
    2. User-facing defaults (from centralized settings)  
    3. Guild-level user overrides (from database)
    4. Channel-level user overrides (from database)
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        use_cache: Whether to use cached settings
        
    Returns:
        Tuple of (resolved_settings_dict, settings_hash)
    """
    # Check cache first if enabled
    if use_cache:
        cached_settings = _user_settings_cache.get_cached_settings(guild_id, channel_id)
        if cached_settings is not None:
            cached_hash = _user_settings_cache.get_cached_hash(guild_id, channel_id)
            logger.debug(f"Using cached settings for {guild_id}:{channel_id}")
            return cached_settings, cached_hash or ""
    
    # Start with static bot/system defaults
    effective_settings = {}
    
    # 1. Bot/system channel defaults (static, never change)
    effective_settings.update(get_channel_defaults())
    
    # 2. User-facing defaults (static, but user-modifiable categories)
    effective_settings.update(get_user_facing_defaults())
    
    # Track components for hash computation
    guild_hash = None
    channel_hash = None
    
    # 3. Guild-level user settings from database
    try:
        guild_settings = await GuildSettings.get_or_none(guild_id=guild_id)
        if guild_settings:
            # Apply guild-level default channel settings if they exist
            if guild_settings.default_channel_settings:
                effective_settings.update(guild_settings.default_channel_settings)
            
            # Apply guild-level settings if they exist
            if guild_settings.settings:
                effective_settings.update(guild_settings.settings)
            
            # Use stored hash if available, otherwise compute it
            if hasattr(guild_settings, 'settings_hash') and guild_settings.settings_hash:
                guild_hash = guild_settings.settings_hash
            elif guild_settings.settings or guild_settings.default_channel_settings:
                # Compute and store hash for future use
                guild_data = {}
                if guild_settings.default_channel_settings:
                    guild_data.update(guild_settings.default_channel_settings)
                if guild_settings.settings:
                    guild_data.update(guild_settings.settings)
                guild_hash = compute_settings_hash(guild_data)
                # Update the database with computed hash (if column exists)
                if hasattr(guild_settings, 'settings_hash'):
                    guild_settings.settings_hash = guild_hash
                    await guild_settings.save(update_fields=['settings_hash'])
    except Exception as e:
        logger.warning(f"Failed to load guild settings for {guild_id}: {e}")
    
    # 4. Channel-specific user overrides from database
    try:
        channel_settings = await ChannelSettings.get_or_none(channel_id=channel_id)
        if channel_settings and channel_settings.settings:
            effective_settings.update(channel_settings.settings)
            
            # Use stored hash if available, otherwise compute it
            if channel_settings.settings_hash:
                channel_hash = channel_settings.settings_hash
            else:
                # Compute and store hash for future use
                channel_hash = compute_settings_hash(channel_settings.settings)
                channel_settings.settings_hash = channel_hash
                await channel_settings.save(update_fields=['settings_hash'])
    except Exception as e:
        logger.warning(f"Failed to load channel settings for {channel_id}: {e}")
    
    # Compute final hash from all components
    # This ensures the hash changes when any component changes
    hash_components = []
    
    # Always include static defaults hash (computed once)
    static_defaults = {}
    static_defaults.update(get_channel_defaults())
    static_defaults.update(get_user_facing_defaults())
    hash_components.append(compute_settings_hash(static_defaults))
    
    # Add guild hash if present
    if guild_hash:
        hash_components.append(guild_hash)
    
    # Add channel hash if present
    if channel_hash:
        hash_components.append(channel_hash)
    
    # Compute final hash from components
    combined_hash_input = ":".join(hash_components)
    settings_hash = hashlib.md5(combined_hash_input.encode()).hexdigest()
    
    # Cache the resolved settings
    if use_cache:
        _user_settings_cache.cache_settings(guild_id, channel_id, effective_settings, settings_hash)
    
    logger.debug(f"Resolved settings for {guild_id}:{channel_id} (hash: {settings_hash[:8]})")
    return effective_settings, settings_hash


async def get_settings_hash_only(guild_id: str, channel_id: str) -> str:
    """
    Get just the settings hash for comparison without full resolution.
    
    This is useful for checking if settings have changed without the overhead
    of full resolution when you already have cached settings.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        Settings hash string
    """
    # Check if we have a cached hash first
    cached_hash = _user_settings_cache.get_cached_hash(guild_id, channel_id)
    if cached_hash:
        return cached_hash
    
    # If no cached hash, do full resolution
    _, settings_hash = await resolve_user_settings(guild_id, channel_id, use_cache=True)
    return settings_hash


def compute_settings_hash(settings: Dict[str, Any]) -> str:
    """
    Compute MD5 hash of settings for comparison.
    
    Used to detect when settings have changed and caches need invalidation.
    
    Args:
        settings: Settings dictionary
        
    Returns:
        MD5 hash string
    """
    # Sort keys for consistent hash
    settings_json = json.dumps(settings, sort_keys=True)
    return hashlib.md5(settings_json.encode()).hexdigest()


def clear_settings_cache(guild_id: str, channel_id: Optional[str] = None) -> None:
    """
    Clear cached settings for a guild or specific channel.
    
    Call this when user settings are updated to ensure fresh data is loaded.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Optional channel snowflake. If None, clears all channels for guild.
    """
    _user_settings_cache.clear_cache(guild_id, channel_id)
    logger.debug(f"Cleared settings cache for guild {guild_id}" + (f", channel {channel_id}" if channel_id else ""))


async def validate_settings_unchanged(guild_id: str, channel_id: str, expected_hash: str) -> bool:
    """
    Validate that settings haven't changed since a given hash.
    
    This is useful for batch jobs to ensure settings consistency throughout processing.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        expected_hash: Expected settings hash
        
    Returns:
        True if settings are unchanged, False if they've been modified
    """
    current_hash = await get_settings_hash_only(guild_id, channel_id)
    return current_hash == expected_hash
