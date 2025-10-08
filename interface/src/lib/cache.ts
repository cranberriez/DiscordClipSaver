import "server-only";

// Tiny in-memory cache with TTL for server runtime
// Note: Resets on server restart/redeploy. Replace with Redis/etc for durability.

type Entry<T> = { value: T; expiresAt: number };
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

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
	store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheWith<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
	const existing = cacheGet<T>(key);
	if (existing !== null) return Promise.resolve(existing);
	return fn().then((v) => {
		cacheSet(key, v, ttlMs);
		return v;
	});
}

export function cacheUserScoped<T>(userId: string, key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
	const composedKey = `user:${userId}:${key}`;
	return cacheWith<T>(composedKey, ttlMs, fn);
}
