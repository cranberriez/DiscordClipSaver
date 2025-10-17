"""
Settings resolver for fetching and merging guild/channel settings

Includes TTL-based cache to avoid repeated database queries for the same channel.
"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from shared.db.models import GuildSettings, ChannelSettings, Guild, Channel


# Cache configuration (default: 5 minutes TTL)
SETTINGS_CACHE_TTL_SECONDS = int(os.getenv("SETTINGS_CACHE_TTL_SECONDS", "300"))


class SettingsCache:
    """
    TTL-based in-memory cache for channel settings.
    
    Eliminates repeated database queries for the same channel settings,
    significantly reducing DB load during batch processing.
    """
    
    def __init__(self, ttl_seconds: int = SETTINGS_CACHE_TTL_SECONDS):
        self._cache: Dict[str, tuple[ResolvedSettings, datetime]] = {}
        self._lock = asyncio.Lock()
        self._ttl_seconds = ttl_seconds
    
    def _make_key(self, guild_id: str, channel_id: str) -> str:
        """Generate cache key from guild and channel IDs"""
        return f"{guild_id}:{channel_id}"
    
    async def get(self, guild_id: str, channel_id: str) -> Optional['ResolvedSettings']:
        """
        Get cached settings if not expired.
        
        Returns:
            ResolvedSettings if cached and not expired, None otherwise
        """
        key = self._make_key(guild_id, channel_id)
        
        async with self._lock:
            if key not in self._cache:
                return None
            
            settings, cached_at = self._cache[key]
            
            # Check if expired
            age = (datetime.now(timezone.utc) - cached_at).total_seconds()
            if age > self._ttl_seconds:
                # Expired, remove from cache
                del self._cache[key]
                return None
            
            return settings
    
    async def set(self, guild_id: str, channel_id: str, settings: 'ResolvedSettings') -> None:
        """Cache settings with current timestamp"""
        key = self._make_key(guild_id, channel_id)
        
        async with self._lock:
            self._cache[key] = (settings, datetime.now(timezone.utc))
    
    async def invalidate(self, guild_id: str, channel_id: str) -> None:
        """Remove specific channel settings from cache"""
        key = self._make_key(guild_id, channel_id)
        
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    async def invalidate_guild(self, guild_id: str) -> None:
        """Remove all channel settings for a guild from cache"""
        prefix = f"{guild_id}:"
        
        async with self._lock:
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(prefix)]
            for key in keys_to_remove:
                del self._cache[key]
    
    async def clear(self) -> None:
        """Clear entire cache"""
        async with self._lock:
            self._cache.clear()
    
    def stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        return {
            'size': len(self._cache),
            'ttl_seconds': self._ttl_seconds
        }


# Global cache instance
_settings_cache = SettingsCache()


class ResolvedSettings:
    """Resolved settings for a channel (guild defaults + channel overrides)"""
    
    def __init__(self, settings_dict: Dict[str, Any]):
        self.raw = settings_dict
        
        # Extract common settings with defaults
        self.allowed_mime_types = settings_dict.get('allowed_mime_types', [
            'video/mp4',
            'video/quicktime', 
            'video/webm',
            'video/x-msvideo'
        ])
        self.match_regex = settings_dict.get('match_regex', None)
        self.enable_message_content_storage = settings_dict.get('enable_message_content_storage', True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'allowed_mime_types': self.allowed_mime_types,
            'match_regex': self.match_regex,
            'enable_message_content_storage': self.enable_message_content_storage
        }


async def get_channel_settings(guild_id: str, channel_id: str, use_cache: bool = True) -> ResolvedSettings:
    """
    Fetch and resolve settings for a channel with TTL-based caching.
    
    Resolution order:
    1. Check cache (if use_cache=True)
    2. Start with guild's default_channel_settings
    3. Merge with channel's settings overrides (if they exist)
    4. Cache result for TTL duration
    
    Args:
        guild_id: Guild snowflake
        channel_id: Channel snowflake
        use_cache: Whether to use cache (default: True, set False to force DB fetch)
        
    Returns:
        ResolvedSettings object with merged settings
    """
    # Try cache first
    if use_cache:
        cached = await _settings_cache.get(guild_id, channel_id)
        if cached is not None:
            return cached
    
    # Cache miss or disabled - fetch from database
    # Fetch guild settings
    guild_settings = await GuildSettings.get_or_none(guild_id=guild_id).prefetch_related('guild')
    
    # Start with guild defaults
    if guild_settings and guild_settings.default_channel_settings:
        merged_settings = dict(guild_settings.default_channel_settings)
    else:
        # No guild settings, use system defaults
        merged_settings = {}
    
    # Fetch channel settings overrides
    channel_settings = await ChannelSettings.get_or_none(channel_id=channel_id).prefetch_related('channel')
    
    # Merge channel overrides
    if channel_settings and channel_settings.settings:
        merged_settings.update(channel_settings.settings)
    
    # Create resolved settings
    resolved = ResolvedSettings(merged_settings)
    
    # Cache the result
    if use_cache:
        await _settings_cache.set(guild_id, channel_id, resolved)
    
    return resolved


async def get_guild_default_settings(guild_id: str) -> ResolvedSettings:
    """
    Get guild's default channel settings (without channel overrides).
    
    Args:
        guild_id: Guild snowflake
        
    Returns:
        ResolvedSettings object with guild defaults
    """
    guild_settings = await GuildSettings.get_or_none(guild_id=guild_id)
    
    if guild_settings and guild_settings.default_channel_settings:
        return ResolvedSettings(guild_settings.default_channel_settings)
    
    return ResolvedSettings({})


# Cache management functions
async def invalidate_channel_settings(guild_id: str, channel_id: str) -> None:
    """
    Invalidate cached settings for a specific channel.
    
    Call this when channel settings are updated via API.
    """
    await _settings_cache.invalidate(guild_id, channel_id)


async def invalidate_guild_settings(guild_id: str) -> None:
    """
    Invalidate cached settings for all channels in a guild.
    
    Call this when guild default settings are updated via API.
    """
    await _settings_cache.invalidate_guild(guild_id)


async def clear_settings_cache() -> None:
    """Clear entire settings cache. Useful for testing or maintenance."""
    await _settings_cache.clear()


def get_cache_stats() -> Dict[str, int]:
    """
    Get cache statistics.
    
    Returns:
        Dict with 'size' (number of cached entries) and 'ttl_seconds'
    """
    return _settings_cache.stats()
