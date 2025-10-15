# Scan Monitor Specification

## Overview

The Scan Monitor provides real-time visibility into the scanning process, showing users what's happening, progress, and results as they occur.

---

## Core Features

### 1. Live Scan Status
Show current scanning activity in real-time

### 2. Progress Tracking
Visual progress bars and metrics

### 3. Activity Feed
Stream of recent scan events

### 4. Statistics Dashboard
Aggregate metrics and insights

---

## Component Breakdown

### Main Monitor View

```
┌─────────────────────────────────────────────────────────────┐
│ Scan Monitor                                    [Refresh] [⚙]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Current Scan                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔄 Scanning #general                                 │   │
│  │                                                       │   │
│  │ Progress: 450 / 1,000 messages                       │   │
│  │ ████████████████░░░░░░░░░░░░░░░░░░░░ 45%           │   │
│  │                                                       │   │
│  │ Clips Found: 12                                      │   │
│  │ Time Elapsed: 2m 34s                                 │   │
│  │ Est. Remaining: 3m 10s                               │   │
│  │                                                       │   │
│  │                                    [Pause] [Cancel]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Queue (3 channels waiting)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. #gaming (1,234 messages)                          │   │
│  │ 2. #memes (567 messages)                             │   │
│  │ 3. #random (890 messages)                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Recent Activity                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 12:34:56 PM - Found clip in #general (15s video)    │   │
│  │ 12:34:45 PM - Found clip in #general (8s video)     │   │
│  │ 12:34:30 PM - Scanning #general (1000 messages)     │   │
│  │ 12:33:12 PM - Completed #announcements (3 clips)    │   │
│  │ 12:32:45 PM - Started scan of My Gaming Server      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Statistics (Today)                                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│  │ Scans Run    │ Messages     │ Clips Found  │ Errors   │ │
│  │     12       │   45,678     │     234      │    2     │ │
│  └──────────────┴──────────────┴──────────────┴──────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Components

### 1. Current Scan Card

Shows active scan with real-time updates

```tsx
interface CurrentScan {
  id: string;
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  status: "scanning" | "paused" | "error";
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  stats: {
    clipsFound: number;
    messagesScanned: number;
    startedAt: Date;
    estimatedEndAt: Date;
  };
}

<CurrentScanCard scan={currentScan}>
  <ScanHeader>
    <StatusIcon status={scan.status} />
    <ChannelName>#{scan.channelName}</ChannelName>
    <GuildBadge>{scan.guildName}</GuildBadge>
  </ScanHeader>
  
  <ProgressBar
    current={scan.progress.current}
    total={scan.progress.total}
    percentage={scan.progress.percentage}
  />
  
  <ScanMetrics>
    <Metric label="Clips Found" value={scan.stats.clipsFound} />
    <Metric label="Time Elapsed" value={formatDuration(elapsed)} />
    <Metric label="Est. Remaining" value={formatDuration(remaining)} />
  </ScanMetrics>
  
  <ScanActions>
    <Button onClick={pauseScan}>Pause</Button>
    <Button variant="danger" onClick={cancelScan}>Cancel</Button>
  </ScanActions>
</CurrentScanCard>
```

**States**:
- **Scanning**: Active progress, animated icon
- **Paused**: Frozen progress, resume button
- **Error**: Red border, error message, retry button
- **Idle**: No active scan, "Start Scan" button

---

### 2. Scan Queue

Shows upcoming channels to scan

```tsx
interface QueueItem {
  channelId: string;
  channelName: string;
  guildName: string;
  estimatedMessages: number;
  priority: number;
  scheduledAt: Date;
}

<ScanQueue items={queueItems}>
  <QueueHeader>
    <Title>Queue ({queueItems.length} channels waiting)</Title>
    <Actions>
      <Button size="sm" onClick={clearQueue}>Clear Queue</Button>
    </Actions>
  </QueueHeader>
  
  <QueueList>
    {queueItems.map((item, index) => (
      <QueueItem key={item.channelId}>
        <ItemNumber>{index + 1}.</ItemNumber>
        <ChannelInfo>
          <ChannelName>#{item.channelName}</ChannelName>
          <GuildName>{item.guildName}</GuildName>
        </ChannelInfo>
        <ItemMeta>
          <MessageCount>~{item.estimatedMessages} messages</MessageCount>
          <ScheduledTime>{formatRelativeTime(item.scheduledAt)}</ScheduledTime>
        </ItemMeta>
        <ItemActions>
          <IconButton onClick={() => moveUp(item.channelId)}>↑</IconButton>
          <IconButton onClick={() => moveDown(item.channelId)}>↓</IconButton>
          <IconButton onClick={() => removeFromQueue(item.channelId)}>✕</IconButton>
        </ItemActions>
      </QueueItem>
    ))}
  </QueueList>
  
  {queueItems.length === 0 && (
    <EmptyQueue>
      <EmptyIcon>📭</EmptyIcon>
      <EmptyText>No channels in queue</EmptyText>
    </EmptyQueue>
  )}
</ScanQueue>
```

**Features**:
- Reorder queue items
- Remove items from queue
- Show estimated scan time
- Priority indicators

---

### 3. Activity Feed

Real-time stream of scan events

```tsx
interface ActivityEvent {
  id: string;
  type: "scan_started" | "scan_completed" | "clip_found" | "error" | "info";
  timestamp: Date;
  message: string;
  metadata?: {
    guildId?: string;
    channelId?: string;
    clipId?: string;
    errorCode?: string;
  };
}

<ActivityFeed events={recentEvents}>
  <FeedHeader>
    <Title>Recent Activity</Title>
    <Actions>
      <Button size="sm" onClick={clearFeed}>Clear</Button>
      <Toggle checked={autoScroll} onChange={setAutoScroll}>
        Auto-scroll
      </Toggle>
    </Actions>
  </FeedHeader>
  
  <FeedList autoScroll={autoScroll}>
    {events.map(event => (
      <ActivityItem key={event.id} type={event.type}>
        <EventIcon type={event.type} />
        <EventTime>{formatTime(event.timestamp)}</EventTime>
        <EventMessage>{event.message}</EventMessage>
        {event.metadata?.clipId && (
          <EventAction href={`/clips/${event.metadata.clipId}`}>
            View Clip →
          </EventAction>
        )}
      </ActivityItem>
    ))}
  </FeedList>
  
  {events.length === 0 && (
    <EmptyFeed>
      <EmptyText>No recent activity</EmptyText>
    </EmptyFeed>
  )}
</ActivityFeed>
```

**Event Types**:
- 🔄 **scan_started**: "Started scanning #general"
- ✅ **scan_completed**: "Completed #general (12 clips found)"
- 🎬 **clip_found**: "Found clip in #gaming (15s video)"
- ❌ **error**: "Failed to scan #random: Rate limit exceeded"
- ℹ️ **info**: "Scan paused by user"

**Features**:
- Auto-scroll to latest events
- Click events for more details
- Filter by event type
- Export activity log

---

### 4. Statistics Dashboard

Aggregate metrics and insights

```tsx
interface ScanStatistics {
  today: {
    scansRun: number;
    messagesScanned: number;
    clipsFound: number;
    errors: number;
  };
  allTime: {
    totalScans: number;
    totalClips: number;
    totalMessages: number;
  };
  performance: {
    avgScanDuration: number;
    avgClipsPerScan: number;
    avgMessagesPerSecond: number;
  };
}

<StatsDashboard stats={statistics}>
  <StatsGrid>
    <StatCard>
      <StatLabel>Scans Run Today</StatLabel>
      <StatValue>{stats.today.scansRun}</StatValue>
      <StatChange trend="up">+3 from yesterday</StatChange>
    </StatCard>
    
    <StatCard>
      <StatLabel>Messages Scanned</StatLabel>
      <StatValue>{formatNumber(stats.today.messagesScanned)}</StatValue>
      <StatChange trend="up">+12% from yesterday</StatChange>
    </StatCard>
    
    <StatCard>
      <StatLabel>Clips Found</StatLabel>
      <StatValue>{stats.today.clipsFound}</StatValue>
      <StatChange trend="down">-5 from yesterday</StatChange>
    </StatCard>
    
    <StatCard>
      <StatLabel>Errors</StatLabel>
      <StatValue error={stats.today.errors > 0}>
        {stats.today.errors}
      </StatValue>
      {stats.today.errors > 0 && (
        <StatAction href="/logs">View Errors →</StatAction>
      )}
    </StatCard>
  </StatsGrid>
  
  <PerformanceMetrics>
    <MetricRow>
      <MetricLabel>Avg Scan Duration</MetricLabel>
      <MetricValue>{formatDuration(stats.performance.avgScanDuration)}</MetricValue>
    </MetricRow>
    <MetricRow>
      <MetricLabel>Avg Clips per Scan</MetricLabel>
      <MetricValue>{stats.performance.avgClipsPerScan.toFixed(1)}</MetricValue>
    </MetricRow>
    <MetricRow>
      <MetricLabel>Scan Speed</MetricLabel>
      <MetricValue>
        {stats.performance.avgMessagesPerSecond.toFixed(0)} msg/s
      </MetricValue>
    </MetricRow>
  </PerformanceMetrics>
</StatsDashboard>
```

---

## Real-Time Updates

### WebSocket Implementation

```typescript
// Client-side
import { io } from "socket.io-client";

const socket = io("/scan-monitor", {
  auth: { token: authToken },
});

// Subscribe to scan updates
socket.on("scan:started", (data: ScanStartedEvent) => {
  updateCurrentScan(data);
  addActivityEvent({
    type: "scan_started",
    message: `Started scanning #${data.channelName}`,
    timestamp: new Date(),
  });
});

socket.on("scan:progress", (data: ScanProgressEvent) => {
  updateScanProgress(data);
});

socket.on("scan:completed", (data: ScanCompletedEvent) => {
  clearCurrentScan();
  addActivityEvent({
    type: "scan_completed",
    message: `Completed #${data.channelName} (${data.clipsFound} clips)`,
    timestamp: new Date(),
  });
});

socket.on("clip:found", (data: ClipFoundEvent) => {
  incrementClipCount();
  addActivityEvent({
    type: "clip_found",
    message: `Found clip in #${data.channelName} (${data.duration}s video)`,
    timestamp: new Date(),
    metadata: { clipId: data.clipId },
  });
});

socket.on("scan:error", (data: ScanErrorEvent) => {
  setScanError(data);
  addActivityEvent({
    type: "error",
    message: `Error in #${data.channelName}: ${data.error}`,
    timestamp: new Date(),
  });
});
```

### Polling Fallback

For environments without WebSocket support:

```typescript
// Poll every 2 seconds
const POLL_INTERVAL = 2000;

async function pollScanStatus() {
  try {
    const response = await fetch("/api/scans/current");
    const data = await response.json();
    
    updateScanState(data);
  } catch (error) {
    console.error("Failed to poll scan status:", error);
  }
}

// Start polling
const pollInterval = setInterval(pollScanStatus, POLL_INTERVAL);

// Stop polling when component unmounts
return () => clearInterval(pollInterval);
```

---

## API Endpoints

### GET /api/scans/current
Get current scan status

**Response**:
```json
{
  "currentScan": {
    "id": "scan_123",
    "guildId": "guild_456",
    "guildName": "My Gaming Server",
    "channelId": "channel_789",
    "channelName": "general",
    "status": "scanning",
    "progress": {
      "current": 450,
      "total": 1000,
      "percentage": 45
    },
    "stats": {
      "clipsFound": 12,
      "messagesScanned": 450,
      "startedAt": "2025-01-14T12:30:00Z",
      "estimatedEndAt": "2025-01-14T12:35:00Z"
    }
  },
  "queue": [
    {
      "channelId": "channel_101",
      "channelName": "gaming",
      "guildName": "My Gaming Server",
      "estimatedMessages": 1234,
      "priority": 1,
      "scheduledAt": "2025-01-14T12:35:00Z"
    }
  ]
}
```

---

### GET /api/scans/activity
Get recent activity events

**Query Parameters**:
- `limit` (default: 50) - Number of events to return
- `since` (optional) - Timestamp to get events after
- `type` (optional) - Filter by event type

**Response**:
```json
{
  "events": [
    {
      "id": "event_123",
      "type": "clip_found",
      "timestamp": "2025-01-14T12:34:56Z",
      "message": "Found clip in #general (15s video)",
      "metadata": {
        "guildId": "guild_456",
        "channelId": "channel_789",
        "clipId": "clip_999"
      }
    }
  ],
  "hasMore": true
}
```

---

### GET /api/scans/stats
Get scan statistics

**Query Parameters**:
- `period` (default: "today") - "today", "week", "month", "all"

**Response**:
```json
{
  "period": "today",
  "stats": {
    "scansRun": 12,
    "messagesScanned": 45678,
    "clipsFound": 234,
    "errors": 2
  },
  "performance": {
    "avgScanDuration": 180,
    "avgClipsPerScan": 19.5,
    "avgMessagesPerSecond": 253.8
  }
}
```

---

### POST /api/scans/:scanId/pause
Pause an active scan

**Response**:
```json
{
  "success": true,
  "scanId": "scan_123",
  "status": "paused"
}
```

---

### POST /api/scans/:scanId/resume
Resume a paused scan

**Response**:
```json
{
  "success": true,
  "scanId": "scan_123",
  "status": "scanning"
}
```

---

### POST /api/scans/:scanId/cancel
Cancel an active scan

**Response**:
```json
{
  "success": true,
  "scanId": "scan_123",
  "status": "cancelled"
}
```

---

## Database Schema

### scans table

```sql
CREATE TABLE scans (
  id VARCHAR(64) PRIMARY KEY,
  guild_id VARCHAR(64) NOT NULL,
  channel_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL, -- scanning, paused, completed, cancelled, error
  progress_current INT DEFAULT 0,
  progress_total INT DEFAULT 0,
  clips_found INT DEFAULT 0,
  messages_scanned INT DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (guild_id) REFERENCES guild(id),
  FOREIGN KEY (channel_id) REFERENCES channel(id),
  INDEX idx_status (status),
  INDEX idx_guild_id (guild_id),
  INDEX idx_started_at (started_at)
);
```

### scan_events table

```sql
CREATE TABLE scan_events (
  id VARCHAR(64) PRIMARY KEY,
  scan_id VARCHAR(64),
  type VARCHAR(50) NOT NULL, -- scan_started, scan_completed, clip_found, error, info
  message TEXT NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  INDEX idx_scan_id (scan_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
);
```

---

## UI States

### Loading State
```
┌─────────────────────────────────────┐
│ Loading scan status...              │
│ [Spinner animation]                 │
└─────────────────────────────────────┘
```

### Empty State (No Active Scans)
```
┌─────────────────────────────────────┐
│ No active scans                     │
│                                     │
│ 📭                                  │
│                                     │
│ Scans will appear here when active │
│                                     │
│ [Start Manual Scan]                │
└─────────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────────┐
│ ⚠️ Failed to load scan status       │
│                                     │
│ Could not connect to server         │
│                                     │
│ [Retry]                             │
└─────────────────────────────────────┘
```

---

## Performance Considerations

### Optimization Strategies

1. **Debounce Updates**: Don't update UI on every message
   ```typescript
   const debouncedUpdate = debounce(updateProgress, 500);
   ```

2. **Virtual Scrolling**: For long activity feeds
   ```typescript
   import { FixedSizeList } from "react-window";
   ```

3. **Memoization**: Prevent unnecessary re-renders
   ```typescript
   const MemoizedActivityItem = memo(ActivityItem);
   ```

4. **Lazy Loading**: Load historical data on demand
   ```typescript
   const { data, fetchMore } = useInfiniteQuery("activity");
   ```

---

## Mobile Considerations

### Responsive Layout

```
Mobile View (< 768px):
┌─────────────────────┐
│ Current Scan        │
│ [Compact view]      │
├─────────────────────┤
│ Queue (collapsed)   │
│ [Tap to expand]     │
├─────────────────────┤
│ Activity Feed       │
│ [Last 5 events]     │
└─────────────────────┘

Desktop View (>= 768px):
┌─────────────┬─────────────┐
│ Current     │ Queue       │
│ Scan        │             │
├─────────────┴─────────────┤
│ Activity Feed             │
├───────────────────────────┤
│ Statistics                │
└───────────────────────────┘
```

---

## Testing Checklist

### Functional Tests
- [ ] Display current scan correctly
- [ ] Update progress in real-time
- [ ] Show queue items
- [ ] Stream activity events
- [ ] Pause/resume scan
- [ ] Cancel scan
- [ ] Handle WebSocket disconnection
- [ ] Fallback to polling

### Performance Tests
- [ ] Handle 100+ activity events
- [ ] Update UI smoothly (60fps)
- [ ] No memory leaks
- [ ] Efficient re-renders

### Edge Cases
- [ ] No active scans
- [ ] Multiple concurrent scans
- [ ] Very long scan (hours)
- [ ] Network interruption
- [ ] Server restart during scan

---

## Future Enhancements

### Phase 2
- **Scan Scheduling**: Schedule scans for specific times
- **Scan Templates**: Save scan configurations
- **Notifications**: Alert when scan completes
- **Scan Comparison**: Compare results across scans

### Phase 3
- **Predictive Analytics**: Estimate clips before scanning
- **Smart Scanning**: Skip channels with no new messages
- **Distributed Scanning**: Parallel channel scanning
- **Scan Replay**: Review past scans in detail

---

**Last Updated**: January 14, 2025
**Status**: Specification Complete - Ready for Implementation
