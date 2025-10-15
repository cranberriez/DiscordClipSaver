# Redis Architecture for Serverless Scanning

## Overview

Using Redis for real-time updates, job queues, and caching while maintaining serverless compatibility.

---

## Core Use Cases

### 1. Real-Time Scan Updates
Stream scan progress without WebSockets

### 2. Job Queue Management
Background job processing with BullMQ

### 3. Caching Layer
Performance optimization for frequently accessed data

### 4. Rate Limiting
Prevent API abuse and Discord rate limits

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                     │
│                                                              │
│  [Polling every 2s] ──────────────────────────────────────┐ │
└────────────────────────────────────────────────────────────┼─┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                        │
│                                                              │
│  GET /api/scans/current ────────────────────────────────┐   │
│  GET /api/scans/stream/:scanId ─────────────────────────┼─┐ │
└─────────────────────────────────────────────────────────┼─┼─┘
                                                          │ │
                                                          ▼ ▼
┌─────────────────────────────────────────────────────────────┐
│                         Redis                                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Streams         │  │  Job Queue       │               │
│  │  scan:events     │  │  scan:jobs       │               │
│  │  scan:progress   │  │  clip:jobs       │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Cache           │  │  Rate Limits     │               │
│  │  guild:*         │  │  ratelimit:*     │               │
│  │  channel:*       │  │                  │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                                ▲
                                │
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Background Workers                        │
│                                                              │
│  [Discord Scanner] ──> Redis Streams ──> [Clip Processor]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Redis Streams for Scan Updates

### Publishing Scan Events

```typescript
// In scanner worker
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

async function publishScanEvent(scanId: string, event: ScanEvent) {
  await redis.xadd(
    `scan:events:${scanId}`,
    "*", // Auto-generate ID
    "type", event.type,
    "data", JSON.stringify(event.data),
    "timestamp", Date.now().toString()
  );
  
  // Also update current scan state
  await redis.hset(`scan:current:${scanId}`, {
    status: event.data.status,
    progress: event.data.progress,
    clipsFound: event.data.clipsFound,
    updatedAt: Date.now(),
  });
  
  // Set expiry (24 hours)
  await redis.expire(`scan:events:${scanId}`, 86400);
  await redis.expire(`scan:current:${scanId}`, 86400);
}

// Example usage
await publishScanEvent("scan_123", {
  type: "progress",
  data: {
    status: "scanning",
    progress: { current: 450, total: 1000 },
    clipsFound: 12,
  },
});
```

### Consuming Scan Events (API Route)

```typescript
// app/api/scans/stream/[scanId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params;
  const { searchParams } = new URL(req.url);
  const lastId = searchParams.get("lastId") || "0";

  try {
    // Get current scan state
    const currentState = await redis.hgetall(`scan:current:${scanId}`);
    
    // Get new events since lastId
    const events = await redis.xread(
      "COUNT", "100",
      "STREAMS", `scan:events:${scanId}`, lastId
    );

    const parsedEvents = events?.[0]?.[1]?.map(([id, fields]) => ({
      id,
      type: fields[1],
      data: JSON.parse(fields[3]),
      timestamp: parseInt(fields[5]),
    })) || [];

    return NextResponse.json({
      currentState: {
        status: currentState.status,
        progress: parseInt(currentState.progress || "0"),
        clipsFound: parseInt(currentState.clipsFound || "0"),
        updatedAt: parseInt(currentState.updatedAt || "0"),
      },
      events: parsedEvents,
      lastId: parsedEvents[parsedEvents.length - 1]?.id || lastId,
    });
  } catch (error) {
    console.error("Failed to read scan stream:", error);
    return NextResponse.json(
      { error: "Failed to read scan stream" },
      { status: 500 }
    );
  }
}
```

### Client-Side Polling

```typescript
// hooks/useScanStream.ts
import { useState, useEffect, useRef } from "react";

interface ScanState {
  status: string;
  progress: number;
  clipsFound: number;
  updatedAt: number;
}

export function useScanStream(scanId: string) {
  const [state, setState] = useState<ScanState | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const lastIdRef = useRef("0");

  useEffect(() => {
    let isMounted = true;

    async function poll() {
      try {
        const response = await fetch(
          `/api/scans/stream/${scanId}?lastId=${lastIdRef.current}`
        );
        const data = await response.json();

        if (!isMounted) return;

        setState(data.currentState);
        
        if (data.events.length > 0) {
          setEvents(prev => [...prev, ...data.events]);
          lastIdRef.current = data.lastId;
        }
      } catch (error) {
        console.error("Failed to poll scan stream:", error);
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(poll, 2000);
    poll(); // Initial poll

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [scanId]);

  return { state, events };
}
```

---

## BullMQ for Job Processing

### Job Queue Setup

```typescript
// lib/queue/scan-queue.ts
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Define job types
interface ScanJobData {
  guildId: string;
  channelId: string;
  scanMode: "forward" | "backfill";
  options?: {
    maxMessages?: number;
    minVideoSeconds?: number;
  };
}

// Create queue
export const scanQueue = new Queue<ScanJobData>("scan-jobs", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep for 7 days
    },
  },
});

// Add job to queue
export async function queueScan(data: ScanJobData) {
  const job = await scanQueue.add("scan-channel", data, {
    jobId: `scan:${data.guildId}:${data.channelId}:${Date.now()}`,
  });
  
  return job.id;
}

// Worker to process jobs
export const scanWorker = new Worker<ScanJobData>(
  "scan-jobs",
  async (job: Job<ScanJobData>) => {
    console.log(`Processing scan job: ${job.id}`);
    
    const { guildId, channelId, scanMode, options } = job.data;
    
    // Update progress
    await job.updateProgress(0);
    
    // Perform scan (your Discord scanning logic here)
    const result = await performChannelScan({
      guildId,
      channelId,
      scanMode,
      options,
      onProgress: async (progress) => {
        await job.updateProgress(progress);
      },
    });
    
    await job.updateProgress(100);
    
    return result;
  },
  {
    connection,
    concurrency: 5, // Process 5 scans concurrently
  }
);

// Event listeners
scanWorker.on("completed", (job) => {
  console.log(`Scan job ${job.id} completed`);
});

scanWorker.on("failed", (job, err) => {
  console.error(`Scan job ${job?.id} failed:`, err);
});
```

### API Endpoints for Job Management

```typescript
// app/api/jobs/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queueScan } from "@/lib/queue/scan-queue";

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const jobId = await queueScan({
    guildId: body.guildId,
    channelId: body.channelId,
    scanMode: body.scanMode || "forward",
    options: body.options,
  });
  
  return NextResponse.json({ jobId });
}

// app/api/jobs/[jobId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { scanQueue } from "@/lib/queue/scan-queue";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  const job = await scanQueue.getJob(jobId);
  
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  
  const state = await job.getState();
  const progress = job.progress;
  
  return NextResponse.json({
    id: job.id,
    state,
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
  });
}
```

---

## Caching Strategy

### Guild & Channel Caching

```typescript
// lib/cache/guild-cache.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const CACHE_TTL = {
  GUILD: 300, // 5 minutes
  CHANNEL: 600, // 10 minutes
  SETTINGS: 60, // 1 minute
};

export async function getCachedGuild(guildId: string) {
  const cached = await redis.get(`guild:${guildId}`);
  if (cached) return JSON.parse(cached);
  return null;
}

export async function setCachedGuild(guildId: string, data: any) {
  await redis.setex(
    `guild:${guildId}`,
    CACHE_TTL.GUILD,
    JSON.stringify(data)
  );
}

export async function invalidateGuildCache(guildId: string) {
  await redis.del(`guild:${guildId}`);
}

// Usage in API route
export async function getGuild(guildId: string) {
  // Try cache first
  let guild = await getCachedGuild(guildId);
  
  if (!guild) {
    // Fetch from database
    guild = await db.selectFrom("guild")
      .where("id", "=", guildId)
      .selectAll()
      .executeTakeFirst();
    
    if (guild) {
      await setCachedGuild(guildId, guild);
    }
  }
  
  return guild;
}
```

---

## Rate Limiting

### Redis-Based Rate Limiter

```typescript
// lib/rate-limit/limiter.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  const rateLimitKey = `ratelimit:${key}`;
  
  // Remove old entries
  await redis.zremrangebyscore(rateLimitKey, 0, windowStart);
  
  // Count requests in current window
  const requestCount = await redis.zcard(rateLimitKey);
  
  if (requestCount >= config.maxRequests) {
    // Get oldest request timestamp
    const oldest = await redis.zrange(rateLimitKey, 0, 0, "WITHSCORES");
    const resetAt = parseInt(oldest[1]) + config.windowMs;
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }
  
  // Add current request
  await redis.zadd(rateLimitKey, now, `${now}-${Math.random()}`);
  await redis.expire(rateLimitKey, Math.ceil(config.windowMs / 1000));
  
  return {
    allowed: true,
    remaining: config.maxRequests - requestCount - 1,
    resetAt: now + config.windowMs,
  };
}

// Middleware for API routes
export function withRateLimit(
  handler: Function,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 60 }
) {
  return async (req: NextRequest, ...args: any[]) => {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkRateLimit(ip, config);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }
    
    const response = await handler(req, ...args);
    
    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimit.resetAt.toString());
    
    return response;
  };
}
```

---

## Redis Configuration

### Environment Variables

```env
# Redis Connection
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password_here
REDIS_TLS=false

# For serverless (Upstash, Redis Cloud, etc.)
REDIS_HOST=your-redis.upstash.io
REDIS_PORT=6379
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    
  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  redis-data:
```

---

## Serverless Providers

### Recommended Redis Providers

1. **Upstash** (Recommended for serverless)
   - Pay-per-request pricing
   - REST API support
   - Global edge caching
   - Free tier: 10K requests/day

2. **Redis Cloud** (Redis Labs)
   - Managed Redis
   - High availability
   - Free tier: 30MB

3. **AWS ElastiCache**
   - Fully managed
   - VPC integration
   - Expensive for small projects

4. **Railway / Render**
   - Simple deployment
   - Affordable pricing
   - Good for development

---

## Performance Optimization

### Connection Pooling

```typescript
// lib/redis/client.ts
import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    
    redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }
  
  return redisClient;
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});
```

### Batch Operations

```typescript
// Batch get multiple keys
async function batchGet(keys: string[]) {
  const pipeline = redis.pipeline();
  keys.forEach(key => pipeline.get(key));
  const results = await pipeline.exec();
  return results?.map(([err, value]) => (err ? null : value));
}

// Batch set multiple keys
async function batchSet(items: Record<string, any>, ttl: number) {
  const pipeline = redis.pipeline();
  Object.entries(items).forEach(([key, value]) => {
    pipeline.setex(key, ttl, JSON.stringify(value));
  });
  await pipeline.exec();
}
```

---

## Monitoring & Debugging

### Redis Metrics

```typescript
// app/api/admin/redis/stats/route.ts
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis/client";

export async function GET() {
  const redis = getRedisClient();
  
  const info = await redis.info();
  const dbsize = await redis.dbsize();
  const memory = await redis.info("memory");
  
  return NextResponse.json({
    connected: redis.status === "ready",
    dbsize,
    info: parseRedisInfo(info),
    memory: parseRedisInfo(memory),
  });
}

function parseRedisInfo(info: string): Record<string, string> {
  const lines = info.split("\r\n");
  const parsed: Record<string, string> = {};
  
  lines.forEach(line => {
    if (line && !line.startsWith("#")) {
      const [key, value] = line.split(":");
      if (key && value) {
        parsed[key] = value;
      }
    }
  });
  
  return parsed;
}
```

---

## Migration Path

### Phase 1: Basic Caching
- Cache guild/channel data
- Reduce database queries

### Phase 2: Job Queue
- Move scans to background jobs
- Better error handling and retries

### Phase 3: Real-Time Updates
- Redis Streams for scan progress
- Replace polling with efficient streaming

### Phase 4: Advanced Features
- Rate limiting
- Session management
- Distributed locks

---

**Last Updated**: January 14, 2025
**Status**: Architecture Complete - Ready for Implementation
