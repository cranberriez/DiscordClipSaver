# Next.js Interface - Redis & Scan Integration

## Overview

The Next.js interface now has **direct access** to both PostgreSQL and Redis, eliminating the need for API calls to the bot.

### Architecture

```
Next.js Interface
  ├── PostgreSQL (via Kysely)
  │   └── Scan status queries
  └── Redis (via ioredis)
      └── Job queue (producer only)

Python Worker
  └── Redis (consumer)
      └── Processes jobs
```

## Installation

```bash
cd interface
npm install
```

This will install `ioredis@^5.4.2` which was added to `package.json`.

## What Was Created

### Redis Client & Jobs

- **`src/lib/redis/client.ts`** - Redis singleton (server-only)
- **`src/lib/redis/jobs.ts`** - Job queue operations
  - `startBatchScan()` - Start historical channel scan
  - `queueMessageScan()` - Queue specific messages
  - `getStreamInfo()` - Monitor queue
- **`src/lib/redis/types.ts`** - TypeScript types matching Python models

### Database Queries

- **`src/lib/db/schemas/channel_scan_status.kysely.ts`** - Kysely schema
- **`src/lib/db/queries/scan-status.ts`** - Scan status queries
  - `getChannelScanStatus()` - Single channel status
  - `getGuildScanStatuses()` - All statuses for guild
  - `getChannelScanStatusesWithInfo()` - Statuses with channel names

### Server Actions

- **`src/lib/actions/scan.ts`** - Server actions for mutations
  - `startChannelScan()` - Start scan for one channel
  - `startMultipleChannelScans()` - Batch start scans

### React Hooks

- **`src/lib/hooks/use-scan-status.ts`** - Client-side hooks
  - `useChannelScanStatus()` - Fetch single channel status
  - `useGuildScanStatuses()` - Fetch all guild statuses
  - `usePolledScanStatus()` - Auto-polling for active scans

### API Routes

- **`src/app/api/guilds/[guildId]/channels/[channelId]/scan-status/route.ts`**
- **`src/app/api/guilds/[guildId]/scan-statuses/route.ts`**

## Usage Examples

### 1. Start a Channel Scan

```tsx
"use client";
import { startChannelScan } from "@/lib/actions/scan";

export function ScanButton({ guildId, channelId }: Props) {
    const [loading, setLoading] = useState(false);
    
    const handleScan = async () => {
        setLoading(true);
        const result = await startChannelScan(guildId, channelId, {
            direction: "backward",  // Scan from newest to oldest
            limit: 100,             // Messages per batch
            autoContinue: true,     // Continue until channel fully scanned
        });
        
        if (result.success) {
            alert(`Scan started! Job ID: ${result.jobId}`);
        } else {
            alert(`Failed: ${result.error}`);
        }
        setLoading(false);
    };
    
    return (
        <button onClick={handleScan} disabled={loading}>
            {loading ? "Starting..." : "Scan Channel"}
        </button>
    );
}
```

### 2. Display Scan Status

```tsx
"use client";
import { useChannelScanStatus } from "@/lib/hooks/use-scan-status";

export function ScanStatus({ guildId, channelId }: Props) {
    const { status, loading, error } = useChannelScanStatus(guildId, channelId);
    
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    
    if (!status) {
        return <div className="text-gray-500">This channel hasn't been scanned</div>;
    }
    
    return (
        <div className="space-y-2">
            <div>
                <span className="font-semibold">Status:</span>{" "}
                <StatusBadge status={status.status} />
            </div>
            <div>
                <span className="font-semibold">Messages with clips:</span>{" "}
                {status.message_count}
            </div>
            <div>
                <span className="font-semibold">Total scanned:</span>{" "}
                {status.total_messages_scanned}
            </div>
            {status.error_message && (
                <div className="text-red-600">Error: {status.error_message}</div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors = {
        PENDING: "bg-yellow-100 text-yellow-800",
        RUNNING: "bg-blue-100 text-blue-800",
        SUCCEEDED: "bg-green-100 text-green-800",
        FAILED: "bg-red-100 text-red-800",
        CANCELLED: "bg-gray-100 text-gray-800",
    };
    
    return (
        <span className={`px-2 py-1 rounded ${colors[status]}`}>
            {status}
        </span>
    );
}
```

### 3. Live Polling During Scan

```tsx
"use client";
import { usePolledScanStatus } from "@/lib/hooks/use-scan-status";

export function LiveScanStatus({ guildId, channelId }: Props) {
    // Automatically polls every 5 seconds while status is RUNNING or PENDING
    const { status, loading } = usePolledScanStatus(guildId, channelId, 5000);
    
    if (!status) return <div>Not scanned</div>;
    
    const isActive = status.status === "RUNNING" || status.status === "PENDING";
    
    return (
        <div>
            <div className="flex items-center gap-2">
                <span>Status: {status.status}</span>
                {isActive && <Spinner />}
            </div>
            {isActive && (
                <div className="text-sm text-gray-600">
                    Scanned {status.total_messages_scanned} messages so far...
                </div>
            )}
        </div>
    );
}
```

### 4. Guild Dashboard with All Channels

```tsx
"use client";
import { useGuildScanStatuses } from "@/lib/hooks/use-scan-status";
import { startChannelScan } from "@/lib/actions/scan";

export function GuildScanDashboard({ guildId }: Props) {
    const { statuses, loading, refetch } = useGuildScanStatuses(guildId);
    
    const handleScanAll = async () => {
        const unscannedChannels = statuses
            .filter((ch) => !ch.status)
            .map((ch) => ch.channelId);
        
        for (const channelId of unscannedChannels) {
            await startChannelScan(guildId, channelId);
        }
        
        refetch();
    };
    
    return (
        <div>
            <div className="flex justify-between mb-4">
                <h2>Channel Scan Status</h2>
                <button onClick={handleScanAll}>Scan All Unscanned</button>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Status</th>
                        <th>Messages</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {statuses.map((channel) => (
                        <tr key={channel.channelId}>
                            <td>#{channel.channelName}</td>
                            <td>{channel.status || "Not scanned"}</td>
                            <td>{channel.messageCount}</td>
                            <td>
                                {channel.updatedAt
                                    ? new Date(channel.updatedAt).toLocaleString()
                                    : "-"}
                            </td>
                            <td>
                                <button
                                    onClick={() =>
                                        startChannelScan(guildId, channel.channelId)
                                    }
                                >
                                    Scan
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

## Environment Variables

Add to `.env.local`:

```env
# Redis connection
REDIS_URL=redis://localhost:6379

# Database (already configured)
DATABASE_URL=postgresql://user:password@localhost:5432/discord_clip_saver
```

## Scan Status Fields

### Status Values

- **`PENDING`** - Job queued, not started yet
- **`RUNNING`** - Scan in progress
- **`SUCCEEDED`** - Scan completed successfully
- **`FAILED`** - Scan failed with error
- **`CANCELLED`** - Scan was cancelled (e.g., channel disabled)

### Message Counts

- **`message_count`** - Number of messages **containing clips** (videos matching criteria)
- **`total_messages_scanned`** - Total Discord messages examined (includes messages without clips)

Example: "Scanned 1000 messages, found clips in 15"

### Message IDs (for gap detection)

- **`forward_message_id`** - Newest message scanned (used for gap detection)
- **`backward_message_id`** - Oldest message scanned (used for continuation)

## Best Practices

1. **Use server actions for mutations** - Always use `startChannelScan()` from server actions
2. **Use hooks for data fetching** - Use `useChannelScanStatus()` for client components
3. **Poll only when necessary** - Use `usePolledScanStatus()` only for active scans
4. **Handle null status** - Always check if channel has been scanned
5. **Show error messages** - Display `error_message` from status when scan fails
6. **Validate before scanning** - Check `message_scan_enabled` flag

## Type Safety

All types match the Python Pydantic models:

```typescript
// TypeScript (interface)
interface BatchScanJob {
    type: "batch";
    guild_id: string;
    channel_id: string;
    direction: "forward" | "backward";
    limit: number;
    auto_continue: boolean;
    // ...
}
```

```python
# Python (shared/redis/redis.py)
class BatchScanJob(BaseJob):
    type: Literal["batch"] = "batch"
    guild_id: str
    channel_id: str
    direction: Literal["forward", "backward"] = "backward"
    limit: int = 100
    auto_continue: bool = True
    # ...
```

## Notes

- Interface is **producer-only** - does not consume jobs from Redis
- Worker handles all job processing
- No API calls to bot needed - direct database and Redis access
- All Redis operations are server-side only (`"server-only"` import)
- Hooks use API routes for client-side data fetching
