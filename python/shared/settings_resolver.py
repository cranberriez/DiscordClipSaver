"""
Settings resolver for fetching and merging guild/channel settings
"""
from typing import Optional, Dict, Any
from shared.db.models import GuildSettings, ChannelSettings, Guild, Channel


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


async def get_channel_settings(guild_id: str, channel_id: str) -> ResolvedSettings:
    """
    Fetch and resolve settings for a channel.
    
    Resolution order:
    1. Start with guild's default_channel_settings
    2. Merge with channel's settings overrides (if they exist)
    
    Args:
        guild_id: Guild snowflake
        channel_id: Channel snowflake
        
    Returns:
        ResolvedSettings object with merged settings
    """
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
    
    return ResolvedSettings(merged_settings)


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
