/**
 * Redis client for job queue management
 * Interface is a producer only - does not consume jobs
 */
import "server-only";
import Redis from "ioredis";

type RedisSingleton = Redis & { _isInitialized?: boolean };

const globalForRedis = globalThis as unknown as {
    redis?: RedisSingleton;
};

function assertServerRuntime() {
    if (typeof window !== "undefined") {
        throw new Error("Redis access attempted in browser");
    }
    if (process.env.NEXT_RUNTIME === "edge") {
        throw new Error("Redis not available in Edge runtime");
    }
}

export function getRedis(): Redis {
    assertServerRuntime();
    
    if (!globalForRedis.redis || !globalForRedis.redis._isInitialized) {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        
        const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        }) as RedisSingleton;
        
        redis._isInitialized = true;
        globalForRedis.redis = redis;
    }
    
    return globalForRedis.redis;
}

export const redis = getRedis();
