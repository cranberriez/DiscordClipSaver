"""
Settings resolution and hashing utilities
"""
from shared.models import GuildSettings, ChannelSettings
from shared.schemas import JobSettings
from typing import Optional


async def resolve_channel_settings(guild_id: str, channel_id: str) -> JobSettings:
    """
    Resolve effective settings for a channel.
    Channel overrides take precedence over guild defaults.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        JobSettings object with resolved settings
    """
    # Get guild settings
    guild_settings = await GuildSettings.get_or_none(guild_id=guild_id)
    
    # Start with hardcoded defaults
    effective_settings = {
        "allowed_mime_types": ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"],
        "match_regex": None,
        "scan_mode": "backward",
        "enable_message_content_storage": True
    }
    
    # Apply guild default channel settings if they exist
    if guild_settings and guild_settings.default_channel_settings:
        effective_settings.update(guild_settings.default_channel_settings)
    
    # Apply guild-level settings if they exist
    if guild_settings and guild_settings.settings:
        effective_settings.update(guild_settings.settings)
    
    # Apply channel-specific overrides if they exist
    channel_settings = await ChannelSettings.get_or_none(channel_id=channel_id)
    if channel_settings and channel_settings.settings:
        effective_settings.update(channel_settings.settings)
    
    return JobSettings(**effective_settings)


def get_settings_hash(settings: JobSettings) -> str:
    """
    Get hash of settings for invalidation tracking.
    
    Args:
        settings: JobSettings object
        
    Returns:
        MD5 hash string
    """
    return settings.compute_hash()


async def get_current_settings_hash(guild_id: str, channel_id: str) -> str:
    """
    Get hash of current settings for a channel.
    Useful for comparing if clip settings are outdated.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        MD5 hash of current settings
    """
    settings = await resolve_channel_settings(guild_id, channel_id)
    return settings.compute_hash()


async def is_clip_outdated(clip_settings_hash: str, guild_id: str, channel_id: str) -> bool:
    """
    Check if a clip's settings are outdated compared to current settings.
    
    Args:
        clip_settings_hash: Hash stored on the clip
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        True if clip was created with different settings
    """
    current_hash = await get_current_settings_hash(guild_id, channel_id)
    return clip_settings_hash != current_hash