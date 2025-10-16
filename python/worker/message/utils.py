"""
Shared utility functions for message processing
"""
import hashlib
import json
import urllib.parse
from datetime import datetime, timedelta, timezone
from shared.settings_resolver import ResolvedSettings


def generate_clip_id(message_id: str, channel_id: str, filename: str, timestamp: datetime) -> str:
    """
    Generate unique clip ID from message data.
    
    Uses MD5 hash of message_id:channel_id:filename:timestamp.
    This ensures the same clip is always identified consistently.
    
    Args:
        message_id: Discord message snowflake
        channel_id: Discord channel snowflake
        filename: Attachment filename
        timestamp: Message creation timestamp
        
    Returns:
        32-character hex string (MD5 hash)
    """
    data = f"{message_id}:{channel_id}:{filename}:{timestamp.isoformat()}"
    return hashlib.md5(data.encode()).hexdigest()


def extract_cdn_expiry(cdn_url: str) -> datetime:
    """
    Extract expiry timestamp from Discord CDN URL.
    
    Discord CDN URLs contain 'ex=' parameter with hex-encoded unix timestamp.
    Example: ?ex=6712abc3&is=...&hm=...
    
    Args:
        cdn_url: Discord CDN URL
        
    Returns:
        Expiry datetime (or 24 hours from now if not found)
    """
    parsed = urllib.parse.urlparse(cdn_url)
    params = urllib.parse.parse_qs(parsed.query)
    
    if 'ex' in params:
        try:
            timestamp = int(params['ex'][0], 16)  # Hex timestamp
            return datetime.fromtimestamp(timestamp, timezone.utc)
        except (ValueError, OverflowError):
            pass
    
    # Default: 24 hours from now
    return datetime.now(timezone.utc) + timedelta(hours=24)


def guess_mime_type(filename: str) -> str:
    """
    Guess MIME type from filename extension.
    
    Fallback for when Discord doesn't provide content_type.
    
    Args:
        filename: File name with extension
        
    Returns:
        MIME type string (defaults to video/mp4)
    """
    ext = filename.lower().split('.')[-1]
    mime_types = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'flv': 'video/x-flv',
        'm4v': 'video/x-m4v',
    }
    return mime_types.get(ext, 'video/mp4')


def compute_settings_hash(settings: ResolvedSettings) -> str:
    """
    Compute MD5 hash of settings for comparison.
    
    Used to detect when settings have changed and thumbnails need regeneration.
    
    Args:
        settings: Resolved settings object
        
    Returns:
        32-character hex string (MD5 hash)
    """
    return hashlib.md5(
        json.dumps(settings.to_dict(), sort_keys=True).encode()
    ).hexdigest()


def get_mime_type(attachment, filename: str) -> str:
    """
    Get MIME type from attachment or guess from filename.
    
    Args:
        attachment: Discord attachment object
        filename: Filename to use as fallback
        
    Returns:
        MIME type string
    """
    return attachment.content_type or guess_mime_type(filename)
