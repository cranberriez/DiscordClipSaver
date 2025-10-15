# Redis Streams Architecture

## Stream Naming Convention

Jobs are organized into **guild-level streams** using the pattern:
```
jobs:guild:{guild_id}:{job_type}
```

Channel information is stored as **metadata** within each job entry.

### Examples:
- `jobs:guild:928427413694734396:batch` - All batch scan jobs for guild 928427413694734396
- `jobs:guild:928427413694734396:message` - All message scan jobs for the same guild
- `jobs:guild:999888777666555444:batch` - Batch jobs for a different guild

## Benefits

1. **Guild Isolation** - Each guild has its own streams (security ✓)
2. **Scalable** - Manageable number of streams (4 per guild max)
3. **Metadata Filtering** - Filter by channel using metadata fields
4. **Worker Assignment** - Assign workers to specific guilds
5. **Easy Monitoring** - Track job counts per guild/type

## Worker Patterns

### Pattern 1: Process All Jobs (Default)
```python
# Worker processes jobs from all streams
redis_client = RedisStreamClient(stream_pattern="*")
```

### Pattern 2: Guild-Specific Worker
```python
# Worker only processes jobs for a specific guild
redis_client = RedisStreamClient(stream_pattern="guild:928427413694734396:*")
```

### Pattern 3: Job Type Specific
```python
# Worker only processes batch scan jobs across all guilds
redis_client = RedisStreamClient(stream_pattern="*:batch")
```

### Pattern 4: Guild + Job Type
```python
# Worker only processes batch jobs for a specific guild
redis_client = RedisStreamClient(stream_pattern="guild:928427413694734396:batch")
```

## Interface Usage

### Push a Job
```python
from worker.redis.redis_client import RedisStreamClient
from worker.redis.redis import BatchScanJob, JobSettings

redis_client = RedisStreamClient()
await redis_client.connect()

job = BatchScanJob(
    guild_id="928427413694734396",
    channel_id="1424914917202464798",
    settings=JobSettings(...),
    direction="backward",
    limit=100
)

# Automatically creates stream: jobs:guild:928427413694734396:batch
message_id = await redis_client.push_job(job.model_dump(mode='json'))
```

### List Streams
```python
# List all streams
all_streams = await redis_client.list_streams()

# List streams for a specific guild
guild_streams = await redis_client.list_streams(guild_id="928427413694734396")

# List batch job streams only
batch_streams = await redis_client.list_streams(job_type="batch")

# List batch streams for specific guild
guild_batch = await redis_client.list_streams(
    guild_id="928427413694734396",
    job_type="batch"
)
```

### Peek at Jobs (Interface - Non-Consuming)
```python
# Peek at jobs in a stream without consuming them
stream_name = "jobs:guild:928427413694734396:batch"
jobs = await redis_client.peek_jobs(stream_name, count=10)

for job in jobs:
    print(f"Job ID: {job['metadata']['job_id']}")
    print(f"Channel: {job['metadata']['channel_id']}")  # From metadata!
    print(f"Type: {job['metadata']['job_type']}")
    print(f"Created: {job['job_data']['created_at']}")
```

### Filter Jobs by Channel (Using Metadata)
```python
# Get all jobs for a guild, then filter by channel
stream_name = "jobs:guild:928427413694734396:batch"
all_jobs = await redis_client.peek_jobs(stream_name, count=100)

# Filter by channel using metadata
channel_id = "1424914917202464798"
channel_jobs = [
    job for job in all_jobs 
    if job['metadata']['channel_id'] == channel_id
]

print(f"Found {len(channel_jobs)} jobs for channel {channel_id}")
```

### Get Stream Info
```python
# Get information about a stream
stream_name = "jobs:guild:928427413694734396:batch"
info = await redis_client.get_stream_info(stream_name)

print(f"Jobs in queue: {info['length']}")
print(f"Consumer groups: {info['groups']}")
```

## Stream Structure

Each job in the stream contains:

### Fields:
- `job` - JSON serialized job data (complete job object)
- `guild_id` - Guild snowflake (for filtering)
- `channel_id` - Channel snowflake (for filtering)
- `job_type` - Job type: batch, message, rescan, thumbnail_retry
- `job_id` - Unique job UUID

### Example Stream Entry:
```json
{
  "job": "{\"job_id\": \"abc-123\", \"type\": \"batch\", ...}",
  "guild_id": "928427413694734396",
  "channel_id": "1424914917202464798",
  "job_type": "batch",
  "job_id": "abc-123"
}
```

## Consumer Groups

Each stream has a consumer group named `worker_group`. This allows:
- Multiple workers to process jobs in parallel
- Job acknowledgment (prevents duplicate processing)
- Automatic retry if worker dies (pending messages)

## Migration from Old System

The old system used a single stream `discord_clip_jobs`. The new system:
- ✅ Automatically creates streams per guild/channel/type
- ✅ Workers can still process all jobs with pattern `*`
- ✅ Backward compatible - just update the acknowledge calls to include stream_name

## How Metadata Works

### Storage
When a job is pushed to Redis, it's stored with **both** the complete job data AND extracted metadata fields:

```python
{
  "job": "{...complete job JSON...}",      # Full job data
  "guild_id": "928427413694734396",        # Extracted for filtering
  "channel_id": "1424914917202464798",     # Extracted for filtering  
  "job_type": "batch",                      # Extracted for filtering
  "job_id": "abc-123-def-456"              # Extracted for filtering
}
```

### Why Both?
- **`job` field**: Complete job data for processing
- **Metadata fields**: Fast filtering without parsing JSON

### Filtering
Workers and interfaces can filter jobs by metadata **without** deserializing the full JSON:

```python
# Redis can filter on metadata fields directly
# This is fast because metadata is at the top level
jobs = await peek_jobs(stream_name)
channel_jobs = [j for j in jobs if j['metadata']['channel_id'] == '123']
```

## Performance Considerations

- **Stream Count**: ~4 streams per guild (batch, message, rescan, thumbnail_retry)
  - 100 guilds = 400 streams ✓ Very manageable
  - 1000 guilds = 4000 streams ✓ Still fine
- **Memory**: Each stream is lightweight (~few KB overhead)
- **Metadata Overhead**: Minimal (~100 bytes per job)
- **Filtering Speed**: Metadata filtering is O(n) but fast (no JSON parsing)
- **Cleanup**: Consider TTL or periodic cleanup of completed streams

## How Polling Works

### Worker Polling (Consuming Jobs)
Workers use **XREADGROUP** which is a **blocking** operation:

```python
# Worker blocks for 5 seconds waiting for jobs
jobs = await redis_client.read_jobs(count=1, block=5000)

# What happens:
# 1. Redis checks all matching streams (e.g., jobs:*)
# 2. If jobs exist, returns immediately
# 3. If no jobs, BLOCKS for 5 seconds
# 4. If still no jobs after 5s, returns empty list
# 5. Worker loops and blocks again
```

**Benefits:**
- ✅ Efficient - no busy waiting
- ✅ Low latency - jobs processed immediately when available
- ✅ Low CPU - worker sleeps while waiting
- ✅ Consumer groups prevent duplicate processing

### Interface Polling (Monitoring Jobs)
Interfaces use **XRANGE** which is **non-blocking** and **non-consuming**:

```python
# Interface peeks at jobs without consuming them
jobs = await redis_client.peek_jobs(stream_name, count=10)

# What happens:
# 1. Returns immediately (no blocking)
# 2. Jobs remain in stream (not consumed)
# 3. Can be called repeatedly for monitoring
# 4. Can filter by metadata after fetching
```

**Use Cases:**
- 📊 Dashboard showing pending jobs per guild
- 🔍 Search for specific jobs by channel
- 📈 Monitor queue depths
- ⏱️ Track job age/staleness

### Polling Patterns

#### Pattern 1: Worker - Continuous Processing
```python
while running:
    jobs = await redis.read_jobs(count=1, block=5000)  # Blocks 5s
    for job in jobs:
        await process_job(job)
        await redis.acknowledge_job(stream_name, message_id)
```

#### Pattern 2: Interface - Periodic Monitoring
```python
# Poll every 10 seconds for dashboard updates
while True:
    streams = await redis.list_streams()
    for stream in streams:
        info = await redis.get_stream_info(stream)
        print(f"{stream}: {info['length']} jobs pending")
    await asyncio.sleep(10)
```

#### Pattern 3: Interface - On-Demand Query
```python
# User clicks "Show jobs for this channel"
@app.get("/api/jobs/{guild_id}/{channel_id}")
async def get_channel_jobs(guild_id: str, channel_id: str):
    stream = f"jobs:guild:{guild_id}:batch"
    all_jobs = await redis.peek_jobs(stream, count=100)
    
    # Filter by channel using metadata
    channel_jobs = [
        j for j in all_jobs 
        if j['metadata']['channel_id'] == channel_id
    ]
    
    return {"jobs": channel_jobs, "count": len(channel_jobs)}
```

## Future Enhancements

1. **Priority Queues**: Add priority to stream names (e.g., `jobs:priority:high:guild:123:...`)
2. **Dead Letter Queue**: Failed jobs moved to `jobs:failed:*` streams
3. **Scheduled Jobs**: Use `jobs:scheduled:*` with timestamp-based processing
4. **Metrics**: Track job counts, processing times per stream
5. **Redis Pub/Sub**: Notify interfaces when new jobs arrive (push instead of poll)
