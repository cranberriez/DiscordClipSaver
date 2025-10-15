# Redis Integration for Next.js Interface

The Next.js interface acts as a **producer** for the Redis job queue. It pushes jobs but does not consume them.

## Architecture

```
Next.js Interface (Producer)
  ↓
  Pushes jobs to Redis Streams
  ↓
Redis Streams
  ↓
Python Worker (Consumer)
  ↓
  Processes jobs
```

## Files

### Core

- **`client.ts`** - Redis client singleton (server-only)
- **`jobs.ts`** - Job queue operations (push jobs, get stream info)
- **`types.ts`** - TypeScript types matching Python Pydantic models

### Integration

- **`lib/actions/scan.ts`** - Server actions for starting scans
- **`lib/hooks/use-scan-status.ts`** - React hooks for fetching status
- **`lib/db/queries/scan-status.ts`** - Database queries for scan status
- **`app/api/guilds/[guildId]/scan-statuses/route.ts`** - API routes

## Usage

### Starting a Channel Scan (Server Action)

```tsx
"use client";
import { startChannelScan } from "@/lib/actions/scan";

export function ScanButton({ guildId, channelId }: Props) {
    const handleScan = async () => {
        const result = await startChannelScan(guildId, channelId, {
            direction: "backward",
            limit: 100,
            autoContinue: true,
        });
        
        if (result.success) {
            console.log("Scan started:", result.jobId);
        } else {
            console.error("Scan failed:", result.error);
        }
    };
    
    return <button onClick={handleScan}>Start Scan</button>;
}
```

### Fetching Scan Status (Hook)

```tsx
"use client";
import { useChannelScanStatus } from "@/lib/hooks/use-scan-status";

export function ScanStatus({ guildId, channelId }: Props) {
    const { status, loading, error, refetch } = useChannelScanStatus(guildId, channelId);
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!status) return <div>This channel hasn't been scanned</div>;
    
    return (
        <div>
            <p>Status: {status.status}</p>
            <p>Messages with clips: {status.message_count}</p>
            <p>Total scanned: {status.total_messages_scanned}</p>
            <button onClick={refetch}>Refresh</button>
        </div>
    );
}
```

### Polling for Updates

```tsx
"use client";
import { usePolledScanStatus } from "@/lib/hooks/use-scan-status";

export function LiveScanStatus({ guildId, channelId }: Props) {
    // Polls every 5 seconds while status is RUNNING or PENDING
    const { status } = usePolledScanStatus(guildId, channelId, 5000);
    
    return <div>Status: {status?.status || "Not scanned"}</div>;
}
```

### Guild-wide Scan Statuses

```tsx
"use client";
import { useGuildScanStatuses } from "@/lib/hooks/use-scan-status";

export function GuildScanDashboard({ guildId }: Props) {
    const { statuses, loading } = useGuildScanStatuses(guildId);
    
    return (
        <div>
            {statuses.map((channel) => (
                <div key={channel.channelId}>
                    <h3>{channel.channelName}</h3>
                    <p>Status: {channel.status || "Not scanned"}</p>
                    <p>Messages: {channel.messageCount}</p>
                </div>
            ))}
        </div>
    );
}
```

## Environment Variables

```env
REDIS_URL=redis://localhost:6379
```

## Job Types

### BatchScanJob

Scans N messages from a channel (historical backfill).

```typescript
{
    type: "batch",
    guild_id: "123",
    channel_id: "456",
    direction: "backward",  // or "forward"
    limit: 100,
    before_message_id: null,  // Start from most recent
    after_message_id: null,
    auto_continue: true  // Continue until channel fully scanned
}
```

### MessageScanJob

Scans specific messages (real-time from bot).

```typescript
{
    type: "message",
    guild_id: "123",
    channel_id: "456",
    message_ids: ["789", "790"]
}
```

## Scan Status

### Database Fields

- **`status`** - `PENDING | RUNNING | SUCCEEDED | FAILED | CANCELLED`
- **`message_count`** - Number of messages containing clips
- **`total_messages_scanned`** - Total Discord messages examined
- **`forward_message_id`** - Newest message scanned (for gap detection)
- **`backward_message_id`** - Oldest message scanned (for continuation)
- **`error_message`** - Error details if status is FAILED

### Status Display

```tsx
function getStatusDisplay(status: string | null) {
    if (!status) return "This channel hasn't been scanned";
    
    switch (status) {
        case "PENDING": return "Scan queued...";
        case "RUNNING": return "Scanning in progress...";
        case "SUCCEEDED": return "Scan complete";
        case "FAILED": return "Scan failed";
        case "CANCELLED": return "Scan cancelled";
    }
}
```

## Best Practices

1. **Always use server actions for mutations** (starting scans)
2. **Use hooks for data fetching** (scan status)
3. **Poll only when necessary** (while status is RUNNING/PENDING)
4. **Handle null status** (channel never scanned)
5. **Show error messages** from server actions

## Notes

- Interface is **producer-only** - does not consume jobs
- Worker handles all job processing
- Direct PostgreSQL access for scan status
- Direct Redis access for job queue
- No API calls to bot needed
