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
    STREAM_MAXLEN = int(os.getenv("REDIS_STREAM_MAXLEN", "10000"))
    
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
            maxlen=self.STREAM_MAXLEN,
            approximate=True  # More efficient, allows slight overflow for performance
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
    
    async def _scan_keys(self, pattern: str) -> List[str]:
        """
        Scan for keys matching pattern using non-blocking SCAN command.
        
        SCAN is preferred over KEYS as it doesn't block Redis server during iteration.
        Uses cursor-based iteration to retrieve all matching keys incrementally.
        
        Args:
            pattern: Redis key pattern (supports wildcards like *)
            
        Returns:
            List of matching keys
        """
        keys = []
        cursor = 0
        
        while True:
            # SCAN returns (next_cursor, [keys])
            # cursor=0 means iteration is complete
            cursor, batch = await self.client.scan(cursor=cursor, match=pattern, count=100)
            keys.extend(batch)
            
            if cursor == 0:
                break
        
        return keys
    
    async def _get_matching_streams(self) -> List[str]:
        """Get list of streams matching the pattern using non-blocking SCAN"""
        pattern = f"{self.STREAM_PREFIX}:{self.stream_pattern}"
        keys = await self._scan_keys(pattern)
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
        
        Uses SCAN for non-blocking iteration.
        
        Args:
            guild_id: Filter by guild ID
            job_type: Filter by job type (batch, message, rescan, thumbnail_retry)
            
        Returns:
            List of stream names
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        pattern = self._build_stream_name(guild_id=guild_id, job_type=job_type) + "*"
        keys = await self._scan_keys(pattern)
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
    
    async def peek_jobs(self, stream_name: str, count: int = 10, reverse: bool = False) -> List[Dict[str, Any]]:
        """
        Peek at jobs in a stream without consuming them (for monitoring/interface)
        
        Args:
            stream_name: Name of the stream to peek
            count: Number of jobs to peek at
            reverse: If True, get newest jobs first (default: oldest first)
            
        Returns:
            List of job data with metadata
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        try:
            # Use XRANGE (oldest first) or XREVRANGE (newest first) to read without consuming
            if reverse:
                messages = await self.client.xrevrange(stream_name, '+', '-', count=count)
            else:
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
    
    async def get_pending_jobs_info(self, stream_name: str, consumer_group: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about pending (claimed but not acknowledged) jobs
        Useful for monitoring which jobs are being processed
        
        Args:
            stream_name: Name of the stream
            consumer_group: Consumer group name (uses self.consumer_group if not provided)
            
        Returns:
            Dictionary with pending job statistics
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        group = consumer_group or self.consumer_group
        if not group:
            return {'error': 'No consumer group specified'}
        
        try:
            # Get pending summary
            pending_info = await self.client.xpending(stream_name, group)
            
            # pending_info format: [count, min_id, max_id, consumers]
            # consumers format: [[consumer_name, pending_count], ...]
            
            result = {
                'total_pending': pending_info[0] if pending_info else 0,
                'oldest_pending_id': pending_info[1] if len(pending_info) > 1 else None,
                'newest_pending_id': pending_info[2] if len(pending_info) > 2 else None,
                'consumers': []
            }
            
            # Parse consumer info
            if len(pending_info) > 3 and pending_info[3]:
                for consumer_data in pending_info[3]:
                    result['consumers'].append({
                        'name': consumer_data[0],
                        'pending_count': consumer_data[1]
                    })
            
            return result
        except redis_async.ResponseError as e:
            return {'error': str(e), 'total_pending': 0}
    
    async def get_guild_job_stats(self, guild_id: str) -> Dict[str, Any]:
        """
        Get comprehensive job statistics for a guild (for interface monitoring)
        
        Args:
            guild_id: Guild ID to get stats for
            
        Returns:
            Dictionary with job statistics across all job types
        """
        if not self.connected:
            raise RuntimeError("Redis not connected")
        
        # Find all streams for this guild using SCAN (non-blocking)
        pattern = f"{self.STREAM_PREFIX}:guild:{guild_id}:*"
        streams = await self._scan_keys(pattern)
        
        stats = {
            'guild_id': guild_id,
            'streams': [],
            'total_queued': 0,
            'total_pending': 0,
            'recent_jobs': []
        }
        
        for stream_name in streams:
            try:
                # Get stream info
                info = await self.client.xinfo_stream(stream_name)
                stream_length = info.get('length', 0)
                
                # Extract job type from stream name (jobs:guild:123:message_scan -> message_scan)
                job_type = stream_name.split(':')[-1] if ':' in stream_name else 'unknown'
                
                stream_stats = {
                    'stream_name': stream_name,
                    'job_type': job_type,
                    'queued_count': stream_length,
                    'pending_count': 0
                }
                
                # Get pending info if we have a consumer group
                if self.consumer_group:
                    pending_info = await self.get_pending_jobs_info(stream_name, self.consumer_group)
                    stream_stats['pending_count'] = pending_info.get('total_pending', 0)
                    stream_stats['consumers'] = pending_info.get('consumers', [])
                
                stats['streams'].append(stream_stats)
                stats['total_queued'] += stream_length
                stats['total_pending'] += stream_stats['pending_count']
                
                # Get a few recent jobs from this stream
                recent = await self.peek_jobs(stream_name, count=5, reverse=True)
                stats['recent_jobs'].extend(recent[:5])  # Limit to 5 per stream
                
            except Exception as e:
                logger.debug(f"Could not get stats for stream {stream_name}: {e}")
                continue
        
        # Sort recent jobs by message ID (timestamp-based) descending
        stats['recent_jobs'].sort(key=lambda x: x['message_id'], reverse=True)
        stats['recent_jobs'] = stats['recent_jobs'][:20]  # Keep only 20 most recent
        
        return stats
    
    async def __aenter__(self):
        """Context manager entry"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        await self.disconnect()
