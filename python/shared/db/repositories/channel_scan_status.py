from __future__ import annotations

from typing import Optional
from datetime import datetime

from shared.db.models import ChannelScanStatus, Channel, Guild, ScanStatus


async def get_or_create_scan_status(
    guild_id: str, 
    channel_id: str
) -> ChannelScanStatus:
    """
    Get or create a channel scan status record.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        ChannelScanStatus instance
    """
    guild = await Guild.get(id=str(guild_id))
    channel = await Channel.get(id=str(channel_id))
    
    scan_status, created = await ChannelScanStatus.get_or_create(
        guild=guild,
        channel=channel,
        defaults={
            "status": ScanStatus.QUEUED,
            "message_count": 0,
            "total_messages_scanned": 0,
        }
    )
    
    return scan_status


async def update_scan_status(
    guild_id: str,
    channel_id: str,
    status: Optional[ScanStatus] = None,
    forward_message_id: Optional[str] = None,
    backward_message_id: Optional[str] = None,
    message_count: Optional[int] = None,
    total_messages_scanned: Optional[int] = None,
    error_message: Optional[str] = ...,  # Use sentinel to distinguish None from not provided
) -> ChannelScanStatus:
    """
    Update a channel scan status record.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        status: New scan status
        forward_message_id: Most recent message ID scanned going forward
        backward_message_id: Oldest message ID scanned going backward
        message_count: Count of messages with clips
        total_messages_scanned: Total messages examined
        error_message: Error message if failed (pass None to clear)
        
    Returns:
        Updated ChannelScanStatus instance
    """
    scan_status = await get_or_create_scan_status(guild_id, channel_id)
    
    if status is not None:
        scan_status.status = status
    if forward_message_id is not None:
        scan_status.forward_message_id = forward_message_id
    if backward_message_id is not None:
        scan_status.backward_message_id = backward_message_id
    if message_count is not None:
        scan_status.message_count = message_count
    if total_messages_scanned is not None:
        scan_status.total_messages_scanned = total_messages_scanned
    if error_message is not ...:  # Update if explicitly provided (even if None)
        scan_status.error_message = error_message
    
    await scan_status.save()
    return scan_status


async def increment_scan_counts(
    guild_id: str,
    channel_id: str,
    messages_scanned: int = 0,
    clips_found: int = 0,
) -> ChannelScanStatus:
    """
    Increment scan counts for a channel.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        messages_scanned: Number of messages scanned to add
        clips_found: Number of clips found to add
        
    Returns:
        Updated ChannelScanStatus instance
    """
    scan_status = await get_or_create_scan_status(guild_id, channel_id)
    
    if messages_scanned > 0:
        scan_status.total_messages_scanned += messages_scanned
    if clips_found > 0:
        scan_status.message_count += clips_found
    
    await scan_status.save()
    return scan_status


async def get_scan_status(
    guild_id: str,
    channel_id: str
) -> Optional[ChannelScanStatus]:
    """
    Get a channel scan status record if it exists.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        ChannelScanStatus instance or None
    """
    return await ChannelScanStatus.filter(
        guild_id=str(guild_id),
        channel_id=str(channel_id)
    ).first()


async def reset_scan_status(
    guild_id: str,
    channel_id: str
) -> ChannelScanStatus:
    """
    Reset a channel scan status to initial state.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        Reset ChannelScanStatus instance
    """
    scan_status = await get_or_create_scan_status(guild_id, channel_id)
    
    scan_status.status = ScanStatus.QUEUED
    scan_status.forward_message_id = None
    scan_status.backward_message_id = None
    scan_status.message_count = 0
    scan_status.total_messages_scanned = 0
    scan_status.error_message = None
    
    await scan_status.save()
    return scan_status
