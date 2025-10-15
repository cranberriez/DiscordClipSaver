"""
Get message history for specific guild, channel, and various other properties
"""
import logging
from typing import List, Optional
import discord

logger = logging.getLogger(__name__)


async def get_message_history(
    channel: discord.TextChannel,
    limit: int = 100,
    before_id: Optional[int] = None,
    after_id: Optional[int] = None,
    direction: str = "backward"
) -> List[discord.Message]:
    """
    Fetch message history from a Discord channel
    
    Args:
        channel: Discord channel object
        limit: Maximum number of messages to fetch
        before_id: Message ID to fetch messages before (for backward scan)
        after_id: Message ID to fetch messages after (for forward scan)
        direction: Scan direction ("backward" or "forward")
        
    Returns:
        List of Discord messages
    """
    messages = []
    
    try:
        if direction == "backward":
            # Fetch messages going backward in time
            before = discord.Object(id=before_id) if before_id else None
            
            async for message in channel.history(limit=limit, before=before, oldest_first=False):
                messages.append(message)
                
        elif direction == "forward":
            # Fetch messages going forward in time
            after = discord.Object(id=after_id) if after_id else None
            
            async for message in channel.history(limit=limit, after=after, oldest_first=True):
                messages.append(message)
        else:
            raise ValueError(f"Invalid direction: {direction}. Must be 'backward' or 'forward'")
        
        logger.info(f"Fetched {len(messages)} messages from channel {channel.id} ({direction})")
        
    except discord.Forbidden:
        logger.error(f"No permission to read messages in channel {channel.id}")
        raise
    except discord.HTTPException as e:
        logger.error(f"HTTP error fetching messages from channel {channel.id}: {e}")
        raise
    
    return messages