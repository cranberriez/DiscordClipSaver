"""
Validators for message and attachment filtering
"""
import re
from typing import List, Optional
import discord
from shared.settings_resolver import ResolvedSettings


def has_attachments(message: discord.Message) -> bool:
    """Check if message has any attachments"""
    return bool(message.attachments)


def matches_regex_filter(message: discord.Message, regex_pattern: Optional[str]) -> bool:
    """
    Check if message content matches regex pattern.
    
    Args:
        message: Discord message
        regex_pattern: Regex pattern to match (None = no filter)
        
    Returns:
        True if pattern is None or content matches pattern
    """
    if not regex_pattern:
        return True
    
    if not message.content:
        return False
    
    return bool(re.search(regex_pattern, message.content))


def is_video_attachment(attachment: discord.Attachment, allowed_mime_types: List[str]) -> bool:
    """
    Check if attachment is a video based on MIME type.
    Falls back to file extension for old messages without content_type.
    
    Args:
        attachment: Discord attachment
        allowed_mime_types: List of allowed MIME types
        
    Returns:
        True if attachment is a video
    """
    # First try content_type if available
    if attachment.content_type and attachment.content_type in allowed_mime_types:
        return True
    
    # Fallback to file extension for old messages without content_type
    if not attachment.content_type:
        filename = attachment.filename.lower()
        video_extensions = {'.mp4', '.mov', '.webm', '.avi', '.mkv', '.flv', '.wmv'}
        return any(filename.endswith(ext) for ext in video_extensions)
    
    return False


def filter_video_attachments(
    attachments: List[discord.Attachment],
    allowed_mime_types: List[str]
) -> List[discord.Attachment]:
    """
    Filter list of attachments to only include videos.
    
    Args:
        attachments: List of Discord attachments
        allowed_mime_types: List of allowed MIME types
        
    Returns:
        Filtered list of video attachments
    """
    return [
        att for att in attachments
        if is_video_attachment(att, allowed_mime_types)
    ]


def should_process_message(message: discord.Message, settings: ResolvedSettings) -> bool:
    """
    Determine if a message should be processed based on settings.
    
    Checks:
    - Has attachments
    - Matches regex filter (if configured)
    - Has at least one video attachment
    
    Args:
        message: Discord message
        settings: Resolved settings
        
    Returns:
        True if message should be processed
    """
    # Must have attachments
    if not has_attachments(message):
        return False
    
    # Must match regex filter (if configured)
    if not matches_regex_filter(message, settings.match_regex):
        return False
    
    # Must have at least one video attachment
    video_attachments = filter_video_attachments(
        message.attachments,
        settings.allowed_mime_types
    )
    
    return len(video_attachments) > 0
