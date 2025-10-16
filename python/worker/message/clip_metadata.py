"""
Clip metadata extraction and processing
"""
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict
import discord
from shared.settings_resolver import ResolvedSettings
from worker.message.utils import generate_clip_id, extract_cdn_expiry, get_mime_type
from worker.message.validators import filter_video_attachments


@dataclass
class ClipInfo:
    """Extracted clip information from an attachment"""
    clip_id: str
    message_id: str
    filename: str
    file_size: int
    mime_type: str
    cdn_url: str
    expires_at: datetime


def extract_clip_info(
    attachment: discord.Attachment,
    message: discord.Message,
    channel_id: str
) -> ClipInfo:
    """
    Extract clip information from a Discord attachment.
    
    Args:
        attachment: Discord attachment
        message: Discord message
        channel_id: Channel snowflake
        
    Returns:
        ClipInfo dataclass with extracted information
    """
    clip_id = generate_clip_id(
        str(message.id),
        channel_id,
        attachment.filename,
        message.created_at
    )
    
    expires_at = extract_cdn_expiry(attachment.url)
    mime_type = get_mime_type(attachment, attachment.filename)
    
    return ClipInfo(
        clip_id=clip_id,
        message_id=str(message.id),
        filename=attachment.filename,
        file_size=attachment.size,
        mime_type=mime_type,
        cdn_url=attachment.url,
        expires_at=expires_at
    )


def extract_clips_from_message(
    message: discord.Message,
    channel_id: str,
    settings: ResolvedSettings
) -> List[ClipInfo]:
    """
    Extract all clip information from a message.
    
    Args:
        message: Discord message
        channel_id: Channel snowflake
        settings: Resolved settings for filtering
        
    Returns:
        List of ClipInfo objects
    """
    # Filter to video attachments only
    video_attachments = filter_video_attachments(
        message.attachments,
        settings.allowed_mime_types
    )
    
    # Extract clip info for each video attachment
    clips = []
    for attachment in video_attachments:
        clip_info = extract_clip_info(attachment, message, channel_id)
        clips.append(clip_info)
    
    return clips


def build_clip_id_map(
    messages: List[discord.Message],
    channel_id: str,
    settings: ResolvedSettings
) -> Dict[str, List[ClipInfo]]:
    """
    Build a mapping of message_id -> list of clip info.
    
    Used for bulk processing to pre-compute all clip metadata.
    
    Args:
        messages: List of Discord messages
        channel_id: Channel snowflake
        settings: Resolved settings for filtering
        
    Returns:
        Dictionary mapping message_id to list of ClipInfo objects
    """
    clip_map = {}
    
    for message in messages:
        clips = extract_clips_from_message(message, channel_id, settings)
        if clips:
            clip_map[str(message.id)] = clips
    
    return clip_map


def get_all_clip_ids(clip_map: Dict[str, List[ClipInfo]]) -> List[str]:
    """
    Extract all clip IDs from a clip map.
    
    Args:
        clip_map: Dictionary mapping message_id to list of ClipInfo
        
    Returns:
        Flat list of all clip IDs
    """
    clip_ids = []
    for clips in clip_map.values():
        for clip in clips:
            clip_ids.append(clip.clip_id)
    return clip_ids
