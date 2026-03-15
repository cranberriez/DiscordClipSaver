import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Set
from dataclasses import dataclass
import discord
from shared.time import utcnow

from shared.redis.redis import MessageScanJob

logger = logging.getLogger(__name__)


@dataclass
class MessageBatch:
    """Represents a batch of messages for a specific channel."""
    guild_id: int
    channel_id: int
    message_ids: Set[int]
    first_message_time: datetime
    
    def __post_init__(self):
        """Ensure message_ids is a set for deduplication."""
        if not isinstance(self.message_ids, set):
            self.message_ids = set(self.message_ids)


class MessageBatcher:
    """
    Batches messages with attachments to reduce worker job frequency.
    
    Messages are collected by guild > channel and sent to the worker
    after a cooldown period (default 5 minutes) to batch frequent clips.
    """
    
    def __init__(self, redis_client=None, cooldown_seconds: int = 5):
        self.redis_client = redis_client
        self.cooldown_seconds = cooldown_seconds
        self.cooldown_delta = timedelta(seconds=cooldown_seconds)
        
        # Cache structure: guild_id -> channel_id -> MessageBatch
        self._batches: Dict[int, Dict[int, MessageBatch]] = {}
        
        # Background task for processing expired batches
        self._cleanup_task = None
        self._running = False
    
    async def start(self):
        """Start the background cleanup task."""
        if self._running:
            return
            
        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("MessageBatcher started with %d second cooldown", self.cooldown_seconds)
    
    async def stop(self):
        """Stop the background cleanup task and process remaining batches."""
        if not self._running:
            return
            
        self._running = False
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Process any remaining batches
        await self._process_all_expired_batches()
        logger.info("MessageBatcher stopped")
    
    async def add_message(self, message: discord.Message):
        """
        Add a message to the batch if it has attachments.
        
        Args:
            message: Discord message to potentially batch
        """
        if not self.redis_client:
            logger.warning("Redis client not configured, cannot batch message")
            return
            
        # Only batch messages with attachments (clips)
        if not message.attachments:
            return
        
        guild_id = message.guild.id
        channel_id = message.channel.id
        message_id = message.id
        now = utcnow()
        
        # Initialize guild cache if needed
        if guild_id not in self._batches:
            self._batches[guild_id] = {}
        
        # Initialize or update channel batch
        if channel_id not in self._batches[guild_id]:
            # Create new batch
            self._batches[guild_id][channel_id] = MessageBatch(
                guild_id=guild_id,
                channel_id=channel_id,
                message_ids={message_id},
                first_message_time=now
            )
            logger.debug(
                "Started new message batch for guild=%d channel=%d with message=%d",
                guild_id, channel_id, message_id
            )
        else:
            # Add to existing batch
            batch = self._batches[guild_id][channel_id]
            batch.message_ids.add(message_id)
            logger.debug(
                "Added message=%d to existing batch for guild=%d channel=%d (total: %d messages)",
                message_id, guild_id, channel_id, len(batch.message_ids)
            )
    
    async def _cleanup_loop(self):
        """Background task that periodically checks for expired batches."""
        while self._running:
            try:
                await self._process_all_expired_batches()
                # Check every minute for expired batches
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in MessageBatcher cleanup loop: %s", e, exc_info=True)
                await asyncio.sleep(60)  # Continue after error
    
    async def _process_all_expired_batches(self):
        """Process all expired batches across all guilds and channels."""
        now = utcnow()
        expired_batches = []
        
        # Collect expired batches
        for guild_id, channels in self._batches.items():
            for channel_id, batch in channels.items():
                if now - batch.first_message_time >= self.cooldown_delta:
                    expired_batches.append((guild_id, channel_id, batch))
        
        # Process expired batches
        for guild_id, channel_id, batch in expired_batches:
            await self._process_batch(batch)
            # Remove processed batch from cache
            del self._batches[guild_id][channel_id]
            # Clean up empty guild cache
            if not self._batches[guild_id]:
                del self._batches[guild_id]
    
    async def _process_batch(self, batch: MessageBatch):
        """
        Send a batch of messages to the worker queue.
        
        Args:
            batch: MessageBatch to process
        """
        if not batch.message_ids:
            return
        
        try:
            # Create a single job for all messages in the batch
            job = MessageScanJob(
                guild_id=str(batch.guild_id),
                channel_id=str(batch.channel_id),
                message_ids=[str(msg_id) for msg_id in batch.message_ids]  # Convert to string list
            )
            
            # Send to worker queue using injected redis client
            await self.redis_client.push_job(job.model_dump(mode='json'))
            
            logger.info(
                "Processed message batch for guild=%d channel=%d: %d messages after %s cooldown",
                batch.guild_id,
                batch.channel_id,
                len(batch.message_ids),
                utcnow() - batch.first_message_time
            )
            
        except Exception as e:
            logger.error(
                "Failed to process message batch for guild=%d channel=%d: %s",
                batch.guild_id, batch.channel_id, e, exc_info=True
            )
    
    def get_batch_stats(self) -> Dict:
        """Get current batching statistics for monitoring."""
        total_batches = 0
        total_messages = 0
        oldest_batch_age = None
        now = datetime.utcnow()
        
        for guild_channels in self._batches.values():
            for batch in guild_channels.values():
                total_batches += 1
                total_messages += len(batch.message_ids)
                
                batch_age = now - batch.first_message_time
                if oldest_batch_age is None or batch_age > oldest_batch_age:
                    oldest_batch_age = batch_age
        
        return {
            "total_batches": total_batches,
            "total_messages": total_messages,
            "oldest_batch_age_seconds": oldest_batch_age.total_seconds() if oldest_batch_age else 0,
            "cooldown_minutes": self.cooldown_minutes
        }
    
    def remove_message_from_batch(self, guild_id: int, channel_id: int, message_id: int) -> bool:
        """
        Remove a specific message from its batch if it exists and hasn't been processed yet.
        
        Args:
            guild_id: Discord guild ID
            channel_id: Discord channel ID  
            message_id: Discord message ID to remove
            
        Returns:
            True if message was found and removed from batch, False otherwise
        """
        if guild_id not in self._batches:
            return False
            
        if channel_id not in self._batches[guild_id]:
            return False
            
        batch = self._batches[guild_id][channel_id]
        
        if message_id in batch.message_ids:
            batch.message_ids.remove(message_id)
            logger.info(f"Removed message {message_id} from batch for guild={guild_id} channel={channel_id}")
            
            # If batch is now empty, remove it entirely
            if not batch.message_ids:
                del self._batches[guild_id][channel_id]
                logger.debug(f"Removed empty batch for guild={guild_id} channel={channel_id}")
                
                # If guild has no more batches, remove guild entry
                if not self._batches[guild_id]:
                    del self._batches[guild_id]
                    logger.debug(f"Removed empty guild entry for guild={guild_id}")
            
            return True
        
        return False


# Global instance
_message_batcher = None


def get_message_batcher(redis_client=None) -> MessageBatcher:
    """Get the global MessageBatcher instance."""
    global _message_batcher
    if _message_batcher is None:
        _message_batcher = MessageBatcher(redis_client=redis_client)
    return _message_batcher
