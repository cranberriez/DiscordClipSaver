# Scan Status UI Integration

## What Was Added

A new **"Scan Status"** tab in the guild dashboard that shows all channels with their scan status.

## Features

### 1. **Channel List with Status**
- Shows all channels in the guild
- Displays scan status for each channel
- Shows message counts (clips found / total scanned)

### 2. **Status Badges**
- **Not scanned** - Channel has never been scanned (gray)
- **PENDING** - Scan is queued (yellow)
- **RUNNING** - Scan is in progress (blue)
- **SUCCEEDED** - Scan completed successfully (green)
- **FAILED** - Scan failed with error (red)
- **CANCELLED** - Scan was cancelled (gray)

### 3. **Scan Actions**
- **Scan button** - Start a new scan for a channel
- Disabled while scan is running/pending
- Shows loading state while starting

### 4. **Auto-refresh**
- Manual refresh button
- Can be extended with polling later

## Usage

### Access the UI

1. Navigate to guild dashboard: `/dashboard/[guildId]`
2. Click **"Scan Status"** tab
3. View all channels with their scan status

### Start a Scan

1. Find the channel you want to scan
2. Click the **"Scan"** button
3. Wait for scan to start (button shows "Starting...")
4. Status will update to "PENDING" or "RUNNING"
5. Click **"Refresh"** to see updated progress

### Monitor Progress

**Current:** Manual refresh
**Future:** Auto-polling while scans are active

## Component Structure

```
ScanStatusPanel (Client Component)
  ├── useGuildScanStatuses hook
  │   └── Fetches all channels with scan status
  ├── startChannelScan action
  │   └── Starts a new scan job
  └── Table display
      ├── Channel name
      ├── Status badge
      ├── Message counts
      └── Scan button
```

## API Flow

```
User clicks "Scan" button
  ↓
startChannelScan() server action
  ↓
Validates channel exists and is enabled
  ↓
Pushes BatchScanJob to Redis
  ↓
Returns { success: true, jobId, messageId }
  ↓
UI refetches scan statuses
  ↓
Shows updated status (PENDING → RUNNING → SUCCEEDED)
```

## Data Flow

```
Component mounts
  ↓
useGuildScanStatuses() hook
  ↓
GET /api/guilds/[guildId]/scan-statuses
  ↓
getChannelScanStatusesWithInfo() query
  ↓
Returns all channels with LEFT JOIN on scan_status
  ↓
Hook updates state with channels array
  ↓
Component renders table
```

## Future Enhancements

### 1. **Auto-polling**
```typescript
// Use the polling hook for active scans
const { channels } = useGuildScanStatuses(guildId);
const activeScans = channels.filter(
    ch => ch.status === "RUNNING" || ch.status === "PENDING"
);

// Poll every 5 seconds if there are active scans
useEffect(() => {
    if (activeScans.length > 0) {
        const interval = setInterval(refetch, 5000);
        return () => clearInterval(interval);
    }
}, [activeScans.length]);
```

### 2. **Progress Indicators**
```typescript
// Show progress bar for running scans
{channel.status === "RUNNING" && (
    <div className="mt-2">
        <div className="text-xs text-gray-400">
            {channel.totalMessagesScanned} messages scanned
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
            <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${progress}%` }}
            />
        </div>
    </div>
)}
```

### 3. **Bulk Actions**
```typescript
// Scan all unscanned channels
const handleScanAll = async () => {
    const unscanned = channels.filter(ch => !ch.status);
    for (const channel of unscanned) {
        await startChannelScan(guildId, channel.channelId);
    }
    refetch();
};
```

### 4. **Error Details**
```typescript
// Show error message for failed scans
{channel.status === "FAILED" && channel.errorMessage && (
    <div className="text-xs text-red-400 mt-1">
        {channel.errorMessage}
    </div>
)}
```

### 5. **Last Updated Time**
```typescript
// Show when scan last ran
{channel.updatedAt && (
    <div className="text-xs text-gray-500">
        Last updated: {formatDistanceToNow(channel.updatedAt)} ago
    </div>
)}
```

### 6. **Filters**
```typescript
// Filter by status
const [filter, setFilter] = useState<string | null>(null);
const filtered = channels.filter(
    ch => !filter || ch.status === filter
);
```

## Styling Notes

- Uses existing dashboard styles (border-white/20, bg-white/5, etc.)
- Status badges use semantic colors (green=success, red=error, etc.)
- Table is responsive and matches existing UI patterns
- Buttons follow existing button styles

## Testing Checklist

- [ ] Navigate to Scan Status tab
- [ ] Verify all channels are displayed
- [ ] Check status badges display correctly
- [ ] Click "Scan" button on unscanned channel
- [ ] Verify button shows "Starting..." state
- [ ] Click "Refresh" to see updated status
- [ ] Verify button is disabled for running scans
- [ ] Check message counts display correctly
- [ ] Test with channel that has no scan status (shows "Not scanned")
- [ ] Test with failed scan (shows FAILED badge)

## Current Limitations

1. **No auto-polling** - Must manually refresh to see updates
2. **No progress bar** - Can't see scan progress in real-time
3. **No error details** - Failed scans don't show error message
4. **No bulk actions** - Must scan channels one at a time
5. **No filters** - Can't filter by status

These can be added incrementally as needed! 🎉
