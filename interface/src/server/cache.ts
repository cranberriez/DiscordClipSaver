import "server-only";

// Tiny in-memory cache with TTL for server runtime
// Note: Resets on server restart/redeploy. Replace with Redis/etc for durability.

type Entry<T> = { value: T; expiresAt: number; staleAt: number };
const store = new Map<string, Entry<any>>();

export function cacheGet<T>(key: string): T | null {
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() >= hit.expiresAt) {
        store.delete(key);
        return null;
    }
    return hit.value as T;
}

/**
 * Get cached value even if stale (past normal TTL but before hard expiration).
 * Used for graceful degradation when fresh data can't be fetched.
 */
export function cacheGetStale<T>(key: string): T | null {
    const hit = store.get(key);
    if (!hit) return null;
    // Return value even if past staleAt, but respect hard expiresAt
    if (Date.now() >= hit.expiresAt) {
        store.delete(key);
        return null;
    }
    return hit.value as T;
}

/**
 * Check if cached value is stale (past normal TTL but before hard expiration).
 */
export function cacheIsStale(key: string): boolean {
    const hit = store.get(key);
    if (!hit) return false;
    const now = Date.now();
    return now >= hit.staleAt && now < hit.expiresAt;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number, staleTtlMs?: number): void {
    const now = Date.now();
    // Default: stale after TTL, hard expire after 10x TTL
    const staleAt = now + ttlMs;
    const expiresAt = now + (staleTtlMs ?? ttlMs * 10);
    store.set(key, { value, expiresAt, staleAt });
}

export function cacheWith<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
): Promise<T> {
    const existing = cacheGet<T>(key);
    if (existing !== null) return Promise.resolve(existing);
    return fn().then(v => {
        cacheSet(key, v, ttlMs);
        return v;
    });
}

/**
 * Cache with stale-while-revalidate pattern.
 * If fetch fails, returns stale data if available.
 * This is critical for handling rate limits gracefully.
 */
export async function cacheWithGracefulDegradation<T>(
    key: string,
    ttlMs: number,
    staleTtlMs: number,
    fn: () => Promise<T>
): Promise<T> {
    const existing = cacheGet<T>(key);
    if (existing !== null) return existing;
    
    try {
        const value = await fn();
        cacheSet(key, value, ttlMs, staleTtlMs);
        return value;
    } catch (err: any) {
        // If fetch failed, try to return stale data
        const stale = cacheGetStale<T>(key);
        if (stale !== null) {
            console.warn(`Returning stale cache for ${key} due to error:`, err.message);
            return stale;
        }
        // No stale data available, re-throw error
        throw err;
    }
}

export function cacheUserScoped<T>(
    userId: string,
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
): Promise<T> {
    const composedKey = `user:${userId}:${key}`;
    return cacheWith<T>(composedKey, ttlMs, fn);
}

/**
 * Cache user-scoped data with graceful degradation.
 * Returns stale data if fresh fetch fails (e.g., rate limited).
 */
export function cacheUserScopedGraceful<T>(
    userId: string,
    key: string,
    ttlMs: number,
    staleTtlMs: number,
    fn: () => Promise<T>
): Promise<T> {
    const composedKey = `user:${userId}:${key}`;
    return cacheWithGracefulDegradation<T>(composedKey, ttlMs, staleTtlMs, fn);
}
