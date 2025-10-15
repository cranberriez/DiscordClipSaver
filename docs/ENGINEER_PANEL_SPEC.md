# Engineer Panel Specification

## Overview

The Engineer Panel (aka Super Admin / SUDOER Panel) provides deep system access for developers and administrators running self-hosted instances. This panel is **only available in the open-source self-hosted version**.

---

## Access Control

### SUDOER Configuration

```env
# .env.local
SUDOER_USER_IDS=123456789012345678,987654321098765432
SUDOER_SECRET_KEY=your-super-secret-key-here
ENGINEER_PANEL_ENABLED=true
```

### Authentication Flow

```typescript
// lib/auth/sudoer.ts
import { getAuthInfo } from "@/lib/auth";

export async function isSudoer(req: Request): Promise<boolean> {
  // Check if engineer panel is enabled
  if (process.env.ENGINEER_PANEL_ENABLED !== "true") {
    return false;
  }
  
  // Check if user is authenticated
  const authInfo = await getAuthInfo(req);
  if (!authInfo) return false;
  
  // Check if user ID is in SUDOER list
  const sudoerIds = process.env.SUDOER_USER_IDS?.split(",") || [];
  if (!sudoerIds.includes(authInfo.discordUserId)) {
    return false;
  }
  
  // Optional: Check for secret key in header
  const secretKey = req.headers.get("X-Sudoer-Key");
  if (process.env.SUDOER_SECRET_KEY && secretKey !== process.env.SUDOER_SECRET_KEY) {
    return false;
  }
  
  return true;
}

// Middleware
export async function requireSudoer(req: Request) {
  if (!(await isSudoer(req))) {
    return new Response("Forbidden: SUDOER access required", { status: 403 });
  }
}
```

### UI Access

```tsx
// components/EngineerPanelButton.tsx
"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useState, useEffect } from "react";

export function EngineerPanelButton() {
  const { user } = useAuth();
  const [isSudoer, setIsSudoer] = useState(false);
  
  useEffect(() => {
    async function checkSudoer() {
      const response = await fetch("/api/sudoer/check");
      const data = await response.json();
      setIsSudoer(data.isSudoer);
    }
    
    if (user) {
      checkSudoer();
    }
  }, [user]);
  
  if (!isSudoer) return null;
  
  return (
    <a
      href="/engineer"
      className="fixed bottom-4 right-4 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors"
    >
      🔧 Engineer Panel
    </a>
  );
}
```

---

## Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🔧 Engineer Panel                          [Docs] [Logout]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Navigation                                                  │
│  ├─ 📊 Dashboard                                            │
│  ├─ 📝 Logs                                                 │
│  ├─ 📈 Metrics                                              │
│  ├─ 🗄️  Database                                            │
│  ├─ 🔄 Jobs                                                 │
│  ├─ 🔍 Scans                                                │
│  ├─ 👥 Users                                                │
│  ├─ ⚙️  System                                              │
│  └─ 🧪 Testing                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Dashboard Overview

### System Health

```tsx
<DashboardOverview>
  <HealthCards>
    <HealthCard
      title="System Status"
      status="healthy"
      metrics={[
        { label: "Uptime", value: "7d 12h 34m" },
        { label: "CPU", value: "23%" },
        { label: "Memory", value: "4.2 GB / 16 GB" },
        { label: "Disk", value: "45 GB / 500 GB" },
      ]}
    />
    
    <HealthCard
      title="Database"
      status="healthy"
      metrics={[
        { label: "Connections", value: "12 / 100" },
        { label: "Query Time", value: "45ms avg" },
        { label: "Size", value: "2.3 GB" },
        { label: "Tables", value: "15" },
      ]}
    />
    
    <HealthCard
      title="Redis"
      status="healthy"
      metrics={[
        { label: "Memory", value: "128 MB / 512 MB" },
        { label: "Keys", value: "1,234" },
        { label: "Ops/sec", value: "456" },
        { label: "Hit Rate", value: "94.2%" },
      ]}
    />
    
    <HealthCard
      title="Jobs"
      status="warning"
      metrics={[
        { label: "Active", value: "5" },
        { label: "Waiting", value: "23" },
        { label: "Failed", value: "2" },
        { label: "Completed", value: "1,234" },
      ]}
    />
  </HealthCards>
  
  <QuickStats>
    <StatRow>
      <Stat label="Total Guilds" value="45" change="+3 today" />
      <Stat label="Total Channels" value="234" change="+12 today" />
      <Stat label="Total Clips" value="12,345" change="+89 today" />
      <Stat label="Total Users" value="67" change="+2 today" />
    </StatRow>
  </QuickStats>
  
  <RecentActivity>
    <ActivityItem time="2m ago" type="scan" message="Completed scan of #general (12 clips)" />
    <ActivityItem time="5m ago" type="user" message="New user registered: john#1234" />
    <ActivityItem time="12m ago" type="error" message="Scan failed: Rate limit exceeded" />
  </RecentActivity>
</DashboardOverview>
```

---

## 2. Log Aggregation

### Log Viewer

```tsx
<LogViewer>
  <LogFilters>
    <Select label="Level" options={["All", "Error", "Warn", "Info", "Debug"]} />
    <Select label="Source" options={["All", "API", "Scanner", "Worker", "Database"]} />
    <DateRangePicker label="Time Range" />
    <Input label="Search" placeholder="Search logs..." />
  </LogFilters>
  
  <LogTable>
    <LogRow
      timestamp="2025-01-14 12:34:56"
      level="error"
      source="scanner"
      message="Failed to fetch messages from channel_123"
      details={{ error: "Rate limit exceeded", retryAfter: 30 }}
    />
    <LogRow
      timestamp="2025-01-14 12:34:45"
      level="info"
      source="api"
      message="User authenticated: user_456"
      details={{ ip: "192.168.1.1", userAgent: "Mozilla/5.0..." }}
    />
  </LogTable>
  
  <LogActions>
    <Button onClick={exportLogs}>Export Logs</Button>
    <Button onClick={clearOldLogs}>Clear Old Logs</Button>
    <Button onClick={downloadDebugInfo}>Download Debug Info</Button>
  </LogActions>
</LogViewer>
```

### Log Storage

```typescript
// lib/logger/winston-logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File (errors only)
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // File (all logs)
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// API endpoint to query logs
// app/api/engineer/logs/route.ts
export async function GET(req: NextRequest) {
  await requireSudoer(req);
  
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");
  
  // Read logs from file
  const logs = await readLogsFromFile({
    level,
    source,
    search,
    limit,
  });
  
  return NextResponse.json({ logs });
}
```

---

## 3. Metrics & Monitoring (Grafana Integration)

### Prometheus Metrics

```typescript
// lib/metrics/prometheus.ts
import client from "prom-client";

// Create a Registry
export const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const scanDuration = new client.Histogram({
  name: "scan_duration_seconds",
  help: "Duration of Discord scans in seconds",
  labelNames: ["guild_id", "channel_id", "status"],
  registers: [register],
});

export const clipsFound = new client.Counter({
  name: "clips_found_total",
  help: "Total number of clips found",
  labelNames: ["guild_id", "channel_id"],
  registers: [register],
});

export const activeScans = new client.Gauge({
  name: "active_scans",
  help: "Number of currently active scans",
  registers: [register],
});

// Metrics endpoint
// app/api/metrics/route.ts
export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    headers: { "Content-Type": register.contentType },
  });
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Discord Clip Saver Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count[5m])"
          }
        ]
      },
      {
        "title": "Scan Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(scan_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Clips Found Rate",
        "targets": [
          {
            "expr": "rate(clips_found_total[5m])"
          }
        ]
      },
      {
        "title": "Active Scans",
        "targets": [
          {
            "expr": "active_scans"
          }
        ]
      }
    ]
  }
}
```

### Embedded Grafana

```tsx
<MetricsDashboard>
  <iframe
    src="http://localhost:3000/d/discord-clip-saver"
    width="100%"
    height="800px"
    frameBorder="0"
  />
  
  <QuickMetrics>
    <MetricCard
      title="Request Rate"
      value="45 req/s"
      trend="up"
      change="+12%"
    />
    <MetricCard
      title="Avg Scan Time"
      value="2.3s"
      trend="down"
      change="-8%"
    />
    <MetricCard
      title="Error Rate"
      value="0.2%"
      trend="stable"
      change="0%"
    />
  </QuickMetrics>
</MetricsDashboard>
```

---

## 4. Database Viewer

### Simple Query Interface

```tsx
<DatabaseViewer>
  <TableSelector>
    <Select
      label="Table"
      options={[
        "guild",
        "channel",
        "guild_settings",
        "channel_settings",
        "scans",
        "scan_events",
        "clips",
        "users",
      ]}
      onChange={setSelectedTable}
    />
  </TableSelector>
  
  <QueryBuilder>
    <Input label="WHERE" placeholder="id = '123'" />
    <Input label="ORDER BY" placeholder="created_at DESC" />
    <Input label="LIMIT" placeholder="100" />
    <Button onClick={executeQuery}>Execute</Button>
  </QueryBuilder>
  
  <ResultsTable>
    <DataGrid
      columns={tableColumns}
      rows={queryResults}
      onRowClick={showRowDetails}
    />
  </ResultsTable>
  
  <RawSQL>
    <Textarea
      label="Raw SQL (Advanced)"
      placeholder="SELECT * FROM guild WHERE..."
      rows={5}
    />
    <Button onClick={executeRawSQL}>Execute Raw SQL</Button>
    <Warning>⚠️ Be careful with raw SQL queries</Warning>
  </RawSQL>
</DatabaseViewer>
```

### Safety Features

```typescript
// lib/db/safe-query.ts
export async function executeSafeQuery(sql: string, params: any[]) {
  // Block dangerous operations
  const dangerous = ["DROP", "TRUNCATE", "DELETE", "UPDATE"];
  const upperSQL = sql.toUpperCase();
  
  for (const keyword of dangerous) {
    if (upperSQL.includes(keyword)) {
      throw new Error(`Dangerous operation blocked: ${keyword}`);
    }
  }
  
  // Add LIMIT if not present
  if (!upperSQL.includes("LIMIT")) {
    sql += " LIMIT 1000";
  }
  
  // Execute with timeout
  const result = await db.raw(sql, params).timeout(5000);
  
  return result;
}
```

---

## 5. Active Scans Monitor

### Real-Time Scan Viewer

```tsx
<ActiveScansMonitor>
  <ScanList>
    {activeScans.map(scan => (
      <ScanCard key={scan.id}>
        <ScanHeader>
          <GuildName>{scan.guildName}</GuildName>
          <ChannelName>#{scan.channelName}</ChannelName>
          <StatusBadge status={scan.status} />
        </ScanHeader>
        
        <ScanProgress>
          <ProgressBar
            current={scan.progress.current}
            total={scan.progress.total}
            percentage={scan.progress.percentage}
          />
          <ProgressText>
            {scan.progress.current} / {scan.progress.total} messages
          </ProgressText>
        </ScanProgress>
        
        <ScanMetrics>
          <Metric label="Clips Found" value={scan.clipsFound} />
          <Metric label="Duration" value={formatDuration(scan.duration)} />
          <Metric label="Speed" value={`${scan.speed} msg/s`} />
        </ScanMetrics>
        
        <ScanActions>
          <Button size="sm" onClick={() => pauseScan(scan.id)}>
            Pause
          </Button>
          <Button size="sm" variant="danger" onClick={() => cancelScan(scan.id)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => viewScanDetails(scan.id)}>
            Details
          </Button>
        </ScanActions>
      </ScanCard>
    ))}
  </ScanList>
  
  <ScanQueue>
    <QueueHeader>
      <Title>Queue ({queueLength} waiting)</Title>
      <Button onClick={clearQueue}>Clear Queue</Button>
    </QueueHeader>
    <QueueList>
      {queueItems.map(item => (
        <QueueItem key={item.id}>
          <ItemInfo>
            #{item.channelName} ({item.guildName})
          </ItemInfo>
          <ItemActions>
            <IconButton onClick={() => moveUp(item.id)}>↑</IconButton>
            <IconButton onClick={() => moveDown(item.id)}>↓</IconButton>
            <IconButton onClick={() => removeFromQueue(item.id)}>✕</IconButton>
          </ItemActions>
        </QueueItem>
      ))}
    </QueueList>
  </ScanQueue>
</ActiveScansMonitor>
```

---

## 6. Job Queue Management

### BullMQ Dashboard Integration

```tsx
<JobQueueDashboard>
  {/* Embed Bull Board */}
  <iframe
    src="/admin/queues"
    width="100%"
    height="800px"
    frameBorder="0"
  />
  
  <QuickActions>
    <Button onClick={pauseAllJobs}>Pause All Jobs</Button>
    <Button onClick={resumeAllJobs}>Resume All Jobs</Button>
    <Button onClick={retryFailedJobs}>Retry Failed Jobs</Button>
    <Button onClick={cleanCompletedJobs}>Clean Completed Jobs</Button>
  </QuickActions>
</JobQueueDashboard>
```

### Bull Board Setup

```typescript
// app/admin/queues/route.ts
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { scanQueue } from "@/lib/queue/scan-queue";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(scanQueue)],
  serverAdapter,
});

export async function GET(req: NextRequest) {
  await requireSudoer(req);
  
  // Proxy to Bull Board
  return serverAdapter.getRouter()(req);
}
```

---

## 7. User Management

### User List & Actions

```tsx
<UserManagement>
  <UserFilters>
    <Input placeholder="Search users..." />
    <Select label="Role" options={["All", "Admin", "User"]} />
    <Select label="Status" options={["All", "Active", "Inactive"]} />
  </UserFilters>
  
  <UserTable>
    {users.map(user => (
      <UserRow key={user.id}>
        <UserInfo>
          <Avatar src={user.avatarUrl} />
          <UserName>{user.username}#{user.discriminator}</UserName>
          <UserId>{user.id}</UserId>
        </UserInfo>
        
        <UserStats>
          <Stat label="Guilds" value={user.guildCount} />
          <Stat label="Clips" value={user.clipCount} />
          <Stat label="Last Active" value={formatRelativeTime(user.lastActiveAt)} />
        </UserStats>
        
        <UserActions>
          <Button size="sm" onClick={() => viewUserDetails(user.id)}>
            View
          </Button>
          <Button size="sm" onClick={() => impersonateUser(user.id)}>
            Impersonate
          </Button>
          <Button size="sm" variant="danger" onClick={() => deleteUser(user.id)}>
            Delete
          </Button>
        </UserActions>
      </UserRow>
    ))}
  </UserTable>
</UserManagement>
```

---

## 8. System Configuration

### Environment Variables Editor

```tsx
<SystemConfig>
  <ConfigSection title="Database">
    <ConfigItem
      label="DATABASE_URL"
      value={config.DATABASE_URL}
      type="password"
      editable={false}
    />
    <ConfigItem
      label="DATABASE_POOL_SIZE"
      value={config.DATABASE_POOL_SIZE}
      type="number"
      onChange={updateConfig}
    />
  </ConfigSection>
  
  <ConfigSection title="Redis">
    <ConfigItem
      label="REDIS_URL"
      value={config.REDIS_URL}
      type="password"
      editable={false}
    />
    <ConfigItem
      label="REDIS_MAX_RETRIES"
      value={config.REDIS_MAX_RETRIES}
      type="number"
      onChange={updateConfig}
    />
  </ConfigSection>
  
  <ConfigSection title="Discord">
    <ConfigItem
      label="DISCORD_CLIENT_ID"
      value={config.DISCORD_CLIENT_ID}
      type="text"
      editable={false}
    />
    <ConfigItem
      label="DISCORD_RATE_LIMIT"
      value={config.DISCORD_RATE_LIMIT}
      type="number"
      onChange={updateConfig}
    />
  </ConfigSection>
  
  <ConfigActions>
    <Button onClick={saveConfig}>Save Configuration</Button>
    <Button onClick={restartServices}>Restart Services</Button>
    <Button variant="danger" onClick={resetToDefaults}>
      Reset to Defaults
    </Button>
  </ConfigActions>
</SystemConfig>
```

---

## 9. Testing Tools

### Manual Scan Trigger

```tsx
<TestingTools>
  <ManualScanTrigger>
    <Select label="Guild" options={guilds} onChange={setSelectedGuild} />
    <Select label="Channel" options={channels} onChange={setSelectedChannel} />
    <Select label="Scan Mode" options={["forward", "backfill"]} />
    <NumberInput label="Max Messages" defaultValue={1000} />
    <Button onClick={triggerManualScan}>Start Scan</Button>
  </ManualScanTrigger>
  
  <APITester>
    <Select label="Endpoint" options={apiEndpoints} />
    <Select label="Method" options={["GET", "POST", "PUT", "DELETE"]} />
    <Textarea label="Body (JSON)" rows={10} />
    <Button onClick={testAPI}>Send Request</Button>
    <CodeBlock language="json">{apiResponse}</CodeBlock>
  </APITester>
  
  <DatabaseSeeder>
    <Button onClick={seedTestData}>Seed Test Data</Button>
    <Button onClick={clearTestData}>Clear Test Data</Button>
    <Button onClick={resetDatabase}>Reset Database (Dangerous!)</Button>
  </DatabaseSeeder>
</TestingTools>
```

---

## Security Considerations

### Audit Logging

```typescript
// Log all engineer panel actions
export async function logEngineerAction(
  userId: string,
  action: string,
  details: any
) {
  await db.insertInto("engineer_audit_log").values({
    user_id: userId,
    action,
    details: JSON.stringify(details),
    ip_address: getClientIP(),
    user_agent: getUserAgent(),
    created_at: new Date(),
  });
  
  logger.warn("Engineer action", {
    userId,
    action,
    details,
  });
}
```

### Rate Limiting

```typescript
// Stricter rate limits for engineer panel
export const engineerRateLimit = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
};
```

### Session Timeout

```typescript
// Shorter session timeout for engineer panel
export const ENGINEER_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
```

---

## Docker Compose with Monitoring Stack

```yaml
# docker-compose.engineer.yml
version: "3.8"

services:
  # Main app
  app:
    build: .
    environment:
      - ENGINEER_PANEL_ENABLED=true
      - SUDOER_USER_IDS=${SUDOER_USER_IDS}
    ports:
      - "3000:3000"
  
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
  
  # Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3001:3000"
  
  # Redis Commander
  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      - REDIS_HOSTS=redis:redis:6379
    ports:
      - "8081:8081"

volumes:
  prometheus-data:
  grafana-data:
```

---

**Last Updated**: January 14, 2025
**Status**: Specification Complete - Ready for Implementation
