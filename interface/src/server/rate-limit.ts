import { redis } from "@/lib/redis/client";

/**
 * Rate Limit Helper
 * 
 * Implements a simple sliding window rate limiter using Redis.
 * Usage:
 * const { success, limit, remaining, reset } = await rateLimit(
 *   "ip:127.0.0.1", 
 *   10, // 10 requests
 *   "10 s" // per 10 seconds
 * );
 */

export type Duration = `${number} s` | `${number} m` | `${number} h` | `${number} d`;

function parseDuration(duration: Duration): number {
    const [value, unit] = duration.split(" ");
    const num = parseInt(value, 10);
    switch (unit) {
        case "s": return num * 1000;
        case "m": return num * 60 * 1000;
        case "h": return num * 60 * 60 * 1000;
        case "d": return num * 24 * 60 * 60 * 1000;
        default: throw new Error("Invalid duration unit");
    }
}

export async function rateLimit(
    identifier: string,
    limit: number,
    window: Duration
) {
    const windowMs = parseDuration(window);
    const key = `ratelimit:${identifier}`;
    
    // We use a simple fixed window counter for simplicity with single Redis instance
    // Or we can use sliding window with Lua script if needed.
    // Fixed window is often enough for simple DDoS protection.
    
    // Increment the counter
    const current = await redis.incr(key);
    
    // If it's the first request (1), set expiry
    if (current === 1) {
        await redis.pexpire(key, windowMs);
    }
    
    // Get TTL for headers
    const ttl = await redis.pttl(key);
    
    return {
        success: current <= limit,
        limit,
        remaining: Math.max(0, limit - current),
        reset: Date.now() + (ttl > 0 ? ttl : windowMs),
    };
}
