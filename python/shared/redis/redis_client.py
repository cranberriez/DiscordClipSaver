"""
Redis Stream client for job queue management
"""
import os
import json
import logging
import redis.asyncio as redis_async
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class RedisStreamClient:
    """Manages Redis stream for job queue"""
    
    STREAM_PREFIX = "jobs"
    
    def __init__(
        self, 
        stream_pattern: str = "*",
        consumer_group: Optional[str] = None,
        consumer_name: Optional[str] = None
    ):
        """
        Initialize Redis stream client
        
        Args:
            stream_pattern: Pattern for stream names to consume from
                - "*" = all streams (jobs:*)
                - "guild:{guild_id}" = specific guild (jobs:guild:123)
                - "channel:{channel_id}" = specific channel (jobs:channel:456)
            consumer_group: Consumer group name (required for workers, None for producers like bot)
            consumer_name: Consumer name (required for workers, None for producers like bot)
        """
        self.client: Optional[redis_async.Redis] = None
        self.connected = False
        self.stream_pattern = stream_pattern
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name
        self.is_consumer = consumer_group is not None and consumer_name is not None
    
    async def connect(self):
        """Connect to Redis"""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        
        logger.info(f"Connecting to Redis...")
        
        self.client = await redis_async.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )
        
        # Test connection
        await self.client.ping()
        
        # Consumer groups will be created on-demand when streams are accessed
        
        self.connected = True
        logger.info("Redis connected successfully")
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            self.connected = False
            logger.info("Redis disconnected")
    
    def _build_stream_name(self, guild_id: Optional[str] = None, job_type: Optional[str] = None) -> str:
        """
        Build structured stream name (guild-level with job type)
        
        Examples:
            - jobs:guild:123:batch
            - jobs:guild:123:message
            - jobs:guild:123:*  (all job types for guild)
            - jobs:*  (all jobs)
        """
        parts = [self.STREAM_PREFIX]
        
        if guild_id:
            parts.extend(["guild", guild_id])
        if job_type:
            parts.append(job_type)
        
        return ":".join(parts)
    
    async def push_job(self, job_data: Dict[str, Any], stream_name: Optional[str] = None) -> str:
        """
        Push a job to the stream
        
        Args:
            job_data: Job data dictionary (will be JSON serialized)
            stream_name: Optional custom stream name. If not provided, builds from job data.
            
        Returns:
            Message ID
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        # Build stream name from job data if not provided
        if not stream_name:
            stream_name = self._build_stream_name(
                guild_id=job_data.get('guild_id'),
                job_type=job_data.get('type')
            )
        
        # Serialize job data to JSON plus metadata fields for filtering
        serialized_data = {
            "job": json.dumps(job_data),
            "guild_id": job_data.get('guild_id', ''),
            "channel_id": job_data.get('channel_id', ''),
            "job_type": job_data.get('type', ''),
            "job_id": job_data.get('job_id', '')
        }
        
        # Ensure consumer group exists for this stream
        await self._ensure_consumer_group(stream_name)
        
        message_id = await self.client.xadd(
            name=stream_name,
            fields=serialized_data,
            maxlen=100,  # Keep last 100 jobs per stream
            approximate=True  # More efficient, allows ~10k-10.1k
        )
        
        logger.info(f"Pushed job {job_data.get('job_id', 'unknown')} to stream {stream_name}: {message_id}")
        return message_id
    
    async def _ensure_consumer_group(self, stream_name: str):
        """Ensure consumer group exists for a stream (only if this is a consumer)"""
        if not self.is_consumer:
            return
        
        try:
            await self.client.xgroup_create(
                name=stream_name,
                groupname=self.consumer_group,
                id='0',
                mkstream=True
            )
            logger.debug(f"Created consumer group '{self.consumer_group}' for stream '{stream_name}'")
        except redis_async.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise
    
    async def _get_matching_streams(self) -> List[str]:
        """Get list of streams matching the pattern"""
        pattern = f"{self.STREAM_PREFIX}:{self.stream_pattern}"
        keys = await self.client.keys(pattern)
        return [k for k in keys if k.startswith(self.STREAM_PREFIX)]
    
    async def _claim_pending_jobs(self, streams: List[str], min_idle_time: int = 60000) -> List[Dict[str, Any]]:
        """
        Claim pending jobs from streams (jobs claimed by crashed workers)
        
        Args:
            streams: List of stream names to check
            min_idle_time: Minimum idle time in milliseconds (default 60s)
            
        Returns:
            List of claimed jobs
        """
        claimed_jobs = []
        
        for stream_name in streams:
            try:
                # Get pending messages for this stream
                pending = await self.client.xpending_range(
                    stream_name,
                    self.consumer_group,
                    min='-',
                    max='+',
                    count=10
                )
                
                if not pending:
                    continue
                
                # Check each pending message
                for msg_info in pending:
                    # msg_info format: [message_id, consumer_name, idle_time, delivery_count]
                    message_id = msg_info[0]
                    idle_time = msg_info[2]
                    
                    # Only claim if idle for long enough
                    if idle_time >= min_idle_time:
                        # Claim the message
                        claimed = await self.client.xclaim(
                            stream_name,
                            self.consumer_group,
                            self.consumer_name,
                            min_idle_time=min_idle_time,
                            message_ids=[message_id]
                        )
                        
                        # Parse claimed messages
                        for msg_id, data in claimed:
                            try:
                                job_json = data.get('job', '{}')
                                job_data = json.loads(job_json)
                                
                                claimed_jobs.append({
                                    'stream_name': stream_name,
                                    'message_id': msg_id,
                                    'job_data': job_data,
                                    'metadata': {
                                        'guild_id': data.get('guild_id'),
                                        'channel_id': data.get('channel_id'),
                                        'job_type': data.get('job_type'),
                                        'job_id': data.get('job_id')
                                    }
                                })
                                
                                logger.info(f"Claimed stale job {data.get('job_id')} from stream {stream_name}")
                            except json.JSONDecodeError as e:
                                logger.error(f"Failed to decode claimed job {msg_id}: {e}")
                                # Acknowledge bad message
                                await self.acknowledge_job(stream_name, msg_id)
            
            except Exception as e:
                logger.debug(f"Could not claim pending jobs from {stream_name}: {e}")
                continue
        
        return claimed_jobs
    
    async def read_jobs(self, count: int = 1, block: int = 5000) -> List[Dict[str, Any]]:
        """
        Read jobs from matching streams using consumer group
        
        First attempts to claim any pending messages (from crashed workers),
        then reads new messages.
        
        Note: This method requires consumer_group and consumer_name to be set.
        
        Args:
            count: Number of messages to read
            block: Block time in milliseconds (0 = non-blocking)
            
        Returns:
            List of job dictionaries with metadata
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        if not self.is_consumer:
            raise RuntimeError("read_jobs requires consumer_group and consumer_name to be set")
        
        # Get all streams matching the pattern
        streams = await self._get_matching_streams()
        
        if not streams:
            # No streams yet, return empty
            return []
        
        # Ensure consumer groups exist for all streams
        for stream in streams:
            await self._ensure_consumer_group(stream)
        
        # First, try to claim any pending messages (from crashed workers)
        # Claim messages idle for more than 60 seconds
        pending_jobs = await self._claim_pending_jobs(streams, min_idle_time=60000)
        
        if pending_jobs:
            logger.info(f"Claimed {len(pending_jobs)} pending job(s) from previous worker")
            return pending_jobs
        
        # Build streams dict for xreadgroup
        streams_dict = {stream: '>' for stream in streams}
        
        # Read new messages from all matching streams
        messages = await self.client.xreadgroup(
            groupname=self.consumer_group,
            consumername=self.consumer_name,
            streams=streams_dict,
            count=count,
            block=block
        )
        
        jobs = []
        for stream_name, stream_messages in messages:
            for message_id, data in stream_messages:
                try:
                    # Deserialize job data
                    job_json = data.get('job', '{}')
                    job_data = json.loads(job_json)
                    
                    jobs.append({
                        'stream_name': stream_name,
                        'message_id': message_id,
                        'job_data': job_data,
                        'metadata': {
                            'guild_id': data.get('guild_id'),
                            'channel_id': data.get('channel_id'),
                            'job_type': data.get('job_type'),
                            'job_id': data.get('job_id')
                        }
                    })
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode job {message_id}: {e}")
                    # Acknowledge bad message to remove it from pending
                    await self.acknowledge_job(stream_name, message_id)
        
        return jobs
    
    async def acknowledge_job(self, stream_name: str, message_id: str):
        """
        Acknowledge a job as completed
        
        Note: This method requires consumer_group to be set.
        
        Args:
            stream_name: Redis stream name
            message_id: Redis stream message ID
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        if not self.is_consumer:
            raise RuntimeError("acknowledge_job requires consumer_group to be set")
        
        await self.client.xack(
            stream_name,
            self.consumer_group,
            message_id
        )
        
        # Also delete the message from the stream to save memory
        await self.client.xdel(stream_name, message_id)
        
        logger.debug(f"Acknowledged and deleted job {message_id} from stream {stream_name}")
    
    async def list_streams(self, guild_id: Optional[str] = None, job_type: Optional[str] = None) -> List[str]:
        """
        List all job streams, optionally filtered by guild/job type
        
        Args:
            guild_id: Filter by guild ID
            job_type: Filter by job type (batch, message, rescan, thumbnail_retry)
            
        Returns:
            List of stream names
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        pattern = self._build_stream_name(guild_id=guild_id, job_type=job_type) + "*"
        keys = await self.client.keys(pattern)
        return sorted([k for k in keys if k.startswith(self.STREAM_PREFIX)])
    
    async def get_stream_info(self, stream_name: str) -> Dict[str, Any]:
        """
        Get information about a specific stream
        
        Args:
            stream_name: Name of the stream
            
        Returns:
            Dictionary with stream info (length, first/last entry, etc.)
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        try:
            info = await self.client.xinfo_stream(stream_name)
            return {
                'length': info.get('length', 0),
                'first_entry': info.get('first-entry'),
                'last_entry': info.get('last-entry'),
                'groups': info.get('groups', 0)
            }
        except redis_async.ResponseError:
            return {'length': 0, 'exists': False}
    
    async def peek_jobs(self, stream_name: str, count: int = 10) -> List[Dict[str, Any]]:
        """
        Peek at jobs in a stream without consuming them (for monitoring/interface)
        
        Args:
            stream_name: Name of the stream to peek
            count: Number of jobs to peek at
            
        Returns:
            List of job data with metadata
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        try:
            # Use XRANGE to read without consuming
            messages = await self.client.xrange(stream_name, '-', '+', count=count)
            
            jobs = []
            for message_id, data in messages:
                try:
                    job_json = data.get('job', '{}')
                    job_data = json.loads(job_json)
                    
                    jobs.append({
                        'stream_name': stream_name,
                        'message_id': message_id,
                        'job_data': job_data,
                        'metadata': {
                            'guild_id': data.get('guild_id'),
                            'channel_id': data.get('channel_id'),
                            'job_type': data.get('job_type'),
                            'job_id': data.get('job_id')
                        }
                    })
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode job {message_id}: {e}")
            
            return jobs
        except redis_async.ResponseError:
            return []
    
    async def __aenter__(self):
        """Context manager entry"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        await self.disconnect()
