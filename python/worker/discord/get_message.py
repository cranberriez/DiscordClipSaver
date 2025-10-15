"""
Get details for a specific message with message_id
"""
import logging
import discord

logger = logging.getLogger(__name__)


async def get_message(
    channel: discord.TextChannel,
    message_id: int
) -> discord.Message:
    """
    Fetch a specific message from a channel
    
    Args:
        channel: Discord channel object
        message_id: Message snowflake ID
        
    Returns:
        Discord message object
    """
    try:
        message = await channel.fetch_message(message_id)
        logger.debug(f"Fetched message {message_id} from channel {channel.id}")
        return message
        
    except discord.NotFound:
        logger.error(f"Message {message_id} not found in channel {channel.id}")
        raise
    except discord.Forbidden:
        logger.error(f"No permission to read message {message_id} in channel {channel.id}")
        raise
    except discord.HTTPException as e:
        logger.error(f"HTTP error fetching message {message_id}: {e}")
        raise