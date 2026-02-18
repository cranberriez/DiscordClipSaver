"""
Get message history for specific guild, channel, and various other properties
"""
import logging
import asyncio
from typing import List, Optional
import discord
from worker.discord.retry import execute_with_retry

logger = logging.getLogger(__name__)


async def get_message_history(
    channel: discord.TextChannel,
    limit: int = 100,
    before_id: Optional[int] = None,
    after_id: Optional[int] = None,
    direction: str = "backward"
) -> List[discord.Message]:
    """
    Fetch message history from a Discord channel with retry logic
    
    Args:
        channel: Discord channel object
        limit: Maximum number of messages to fetch
        before_id: Message ID to fetch messages before (for backward scan)
        after_id: Message ID to fetch messages after (for forward scan)
        direction: Scan direction ("backward" or "forward")
        
    Returns:
        List of Discord messages
    """
    
    async def _fetch_history():
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
        
        except discord.HTTPException as e:
            logger.error(f"HTTP Exception during history fetch: Status={e.status}, Code={e.code}, Text={e.text}")
            if e.response:
                logger.error(f"Response Headers: {e.response.headers}")
            raise
        except Exception as e:
            logger.critical(f"Unexpected error during history fetch: {e}", exc_info=True)
            raise

        # Cumulative wait based on batch size to pace the worker
        # 0.5s per 100 messages
        if messages:
            wait_time = (len(messages) / 100) * 0.5
            if wait_time > 0:
                logger.info(f"Batch fetch complete ({len(messages)} msgs). Waiting {wait_time:.2f}s to respect rate limits.")
                await asyncio.sleep(wait_time)
            
        return messages

    try:
        messages = await execute_with_retry(
            _fetch_history,
            max_retries=3,
            base_delay=1.0
        )
        
        logger.info(f"Fetched {len(messages)} messages from channel {channel.id} ({direction})")
        return messages
        
    except discord.Forbidden:
        logger.error(f"No permission to read messages in channel {channel.id}")
        raise
    except discord.HTTPException as e:
        logger.error(f"HTTP error fetching messages from channel {channel.id}: {e}")
        raise