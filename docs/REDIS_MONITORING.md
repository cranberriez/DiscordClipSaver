# Redis Job Queue Monitoring

This document explains how to monitor Redis job queues from the interface **without** claiming or locking jobs.

## Overview

The interface can read from Redis Streams in a **non-destructive** way to display job activity, queue depth, and processing status to users.

## Key Methods

### 1. `peek_jobs()` - View Jobs Without Consuming

```python
jobs = await redis_client.peek_jobs(
    stream_name="jobs:guild:123:message_scan",
    count=10,
    reverse=True  # True = newest first, False = oldest first
)
```

**Returns:**
```python
[
    {
        'stream_name': 'jobs:guild:123:message_scan',
        'message_id': '1234567890-0',
        'job_data': {
            'job_id': 'abc123',
            'type': 'message_scan',
            'guild_id': '123',
            'channel_id': '456',
            # ... other job fields
        },
        'metadata': {
            'guild_id': '123',
            'channel_id': '456',
            'job_type': 'message_scan',
            'job_id': 'abc123'
        }
    },
    # ... more jobs
]
```

**Use Cases:**
- Show recent jobs in activity log
- Display queue contents
- Monitor what's being processed

---

### 2. `get_pending_jobs_info()` - See What Workers Are Processing

```python
pending = await redis_client.get_pending_jobs_info(
    stream_name="jobs:guild:123:message_scan",
    consumer_group="workers"  # Optional, uses default if not provided
)
```

**Returns:**
```python
{
    'total_pending': 5,  # Jobs claimed by workers but not yet acknowledged
    'oldest_pending_id': '1234567890-0',
    'newest_pending_id': '1234567895-0',
    'consumers': [
        {'name': 'worker-1', 'pending_count': 3},
        {'name': 'worker-2', 'pending_count': 2}
    ]
}
```

**Use Cases:**
- Show which workers are active
- Display jobs currently being processed
- Monitor worker health

---

### 3. `get_guild_job_stats()` - Comprehensive Guild Statistics

```python
stats = await redis_client.get_guild_job_stats(guild_id="123")
```

**Returns:**
```python
{
    'guild_id': '123',
    'total_queued': 15,      # Total jobs waiting in all streams
    'total_pending': 5,       # Total jobs being processed
    'streams': [
        {
            'stream_name': 'jobs:guild:123:message_scan',
            'job_type': 'message_scan',
            'queued_count': 10,
            'pending_count': 3,
            'consumers': [
                {'name': 'worker-1', 'pending_count': 2},
                {'name': 'worker-2', 'pending_count': 1}
            ]
        },
        {
            'stream_name': 'jobs:guild:123:thumbnail_retry',
            'job_type': 'thumbnail_retry',
            'queued_count': 5,
            'pending_count': 2,
            'consumers': [...]
        }
    ],
    'recent_jobs': [
        # 20 most recent jobs across all streams
        {...},
        {...}
    ]
}
```

**Use Cases:**
- Dashboard overview
- Activity monitoring
- Queue health check

---

## Interface Integration

### Setup Redis Client (Read-Only)

```typescript
// In your Next.js API route or server action
import { RedisStreamClient } from '@/lib/redis/client';

// Create client WITHOUT consumer group (read-only mode)
const redis = new RedisStreamClient();
await redis.connect();

// Now you can peek without claiming
const jobs = await redis.peek_jobs('jobs:guild:123:message_scan', 10, true);
```

### Example: Activity Log Component

```typescript
// app/api/guilds/[guildId]/job-activity/route.ts
export async function GET(
    request: Request,
    { params }: { params: { guildId: string } }
) {
    const redis = new RedisStreamClient();
    await redis.connect();
    
    try {
        const stats = await redis.get_guild_job_stats(params.guildId);
        return Response.json(stats);
    } finally {
        await redis.disconnect();
    }
}
```

```tsx
// components/guild/JobActivityLog.tsx
export function JobActivityLog({ guildId }: { guildId: string }) {
    const { data } = useQuery({
        queryKey: ['job-activity', guildId],
        queryFn: () => fetch(`/api/guilds/${guildId}/job-activity`).then(r => r.json()),
        refetchInterval: 5000  // Refresh every 5 seconds
    });
    
    return (
        <div>
            <h3>Job Queue Status</h3>
            <p>Queued: {data?.total_queued}</p>
            <p>Processing: {data?.total_pending}</p>
            
            <h4>Recent Activity</h4>
            <ul>
                {data?.recent_jobs.map(job => (
                    <li key={job.message_id}>
                        {job.job_data.type} - Channel {job.metadata.channel_id}
                    </li>
                ))}
            </ul>
            
            <h4>Active Workers</h4>
            {data?.streams.map(stream => (
                <div key={stream.stream_name}>
                    <p>{stream.job_type}: {stream.queued_count} queued, {stream.pending_count} processing</p>
                    {stream.consumers?.map(consumer => (
                        <span key={consumer.name}>
                            {consumer.name} ({consumer.pending_count})
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
```

---

## Important Notes

### ✅ Safe Operations (Non-Destructive)
- `peek_jobs()` - Uses `XRANGE`/`XREVRANGE` (read-only)
- `get_pending_jobs_info()` - Uses `XPENDING` (read-only)
- `get_guild_job_stats()` - Uses `XINFO` and `XRANGE` (read-only)
- `get_stream_info()` - Uses `XINFO` (read-only)

### ❌ Avoid These (Destructive)
- `read_jobs()` - Claims jobs with `XREADGROUP` (locks them to a consumer)
- `acknowledge_job()` - Removes jobs from pending list
- `push_job()` - Adds jobs (but this is fine for the interface to do)

### Performance Considerations

1. **Polling Frequency**: Don't poll too aggressively
   - Every 5-10 seconds is reasonable
   - Use exponential backoff if no activity

2. **Count Limits**: 
   - `peek_jobs(count=10)` - Keep count low (10-20)
   - `get_guild_job_stats()` - Already optimized (5 per stream, max 20 total)

3. **Caching**:
   - Cache results in React Query
   - Use `staleTime` to reduce unnecessary requests

---

## Stream Naming Convention

Streams follow this pattern:
```
jobs:guild:{guild_id}:{job_type}
```

Examples:
- `jobs:guild:123:message_scan`
- `jobs:guild:123:thumbnail_retry`
- `jobs:guild:456:message_scan`

You can list all streams for a guild:
```python
streams = await redis_client.list_streams_for_guild("123")
# Returns: ['jobs:guild:123:message_scan', 'jobs:guild:123:thumbnail_retry']
```

---

## Consumer Groups

Workers use consumer groups to claim jobs:
- **Consumer Group**: `workers` (shared across all workers)
- **Consumer Names**: `worker-1`, `worker-2`, etc. (unique per worker)

The interface should **NOT** set these when creating the client:
```python
# ✅ Interface (read-only)
redis = RedisStreamClient()

# ❌ Worker (consumer)
redis = RedisStreamClient(
    consumer_group="workers",
    consumer_name="worker-1"
)
```

---

## Example UI Features

### 1. Queue Depth Indicator
```tsx
<Badge variant={queueDepth > 100 ? "destructive" : "default"}>
    {queueDepth} jobs queued
</Badge>
```

### 2. Worker Health
```tsx
{consumers.length === 0 ? (
    <Alert variant="warning">No workers active</Alert>
) : (
    <p>{consumers.length} workers processing</p>
)}
```

### 3. Recent Activity Feed
```tsx
<ScrollArea className="h-[400px]">
    {recentJobs.map(job => (
        <div key={job.message_id}>
            <Badge>{job.job_data.type}</Badge>
            <span>Channel: {job.metadata.channel_id}</span>
            <span>{formatRelativeTime(job.message_id)}</span>
        </div>
    ))}
</ScrollArea>
```

### 4. Job Type Breakdown
```tsx
<div className="grid grid-cols-3 gap-4">
    {streams.map(stream => (
        <Card key={stream.stream_name}>
            <CardTitle>{stream.job_type}</CardTitle>
            <p>Queued: {stream.queued_count}</p>
            <p>Processing: {stream.pending_count}</p>
        </Card>
    ))}
</div>
```

---

## Troubleshooting

### "No consumer group specified" Error
- This means you're trying to get pending info without a consumer group
- Either pass `consumer_group="workers"` to the method, or create the client with it
- For interface read-only use, you can skip pending info

### Empty Results
- Stream might not exist yet (no jobs have been pushed)
- Check stream name format: `jobs:guild:{guild_id}:{job_type}`
- Use `list_streams_for_guild()` to see what streams exist

### Performance Issues
- Reduce polling frequency
- Decrease `count` parameter in `peek_jobs()`
- Add caching layer with React Query

---

## See Also

- [REDIS_ARCHITECTURE.md](./REDIS_ARCHITECTURE.md) - Overall Redis design
- [REDIS_STREAMS.md](../python/worker/REDIS_STREAMS.md) - Worker implementation
