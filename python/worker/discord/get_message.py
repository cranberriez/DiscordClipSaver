"""
Get details for a specific message with message_id
"""
import logging
import discord
from worker.discord.retry import execute_with_retry

logger = logging.getLogger(__name__)


async def get_message(
    channel: discord.TextChannel,
    message_id: int
) -> discord.Message:
    """
    Fetch a specific message from a channel with retry logic
    
    Args:
        channel: Discord channel object
        message_id: Message snowflake ID
        
    Returns:
        Discord message object
    """
    try:
        # Wrap the fetch in retry logic
        message = await execute_with_retry(
            channel.fetch_message,
            message_id,
            max_retries=3,
            base_delay=1.0
        )
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