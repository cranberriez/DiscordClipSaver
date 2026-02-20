import "server-only";

// Tiny in-memory cache with TTL for server runtime
// Note: Resets on server restart/redeploy. Replace with Redis/etc for durability.

type Entry<T> = { value: T; expiresAt: number; staleAt: number };
const store = new Map<string, Entry<any>>();
const inflightRequests = new Map<string, Promise<any>>();

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

export function cacheSet<T>(
	key: string,
	value: T,
	ttlMs: number,
	staleTtlMs?: number
): void {
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
	// If we have valid (fresh) data, return it
	if (existing !== null && !cacheIsStale(key)) {
		return Promise.resolve(existing);
	}

	// Check if there's already a request in flight for this key
	const inflight = inflightRequests.get(key);
	if (inflight) {
		return inflight as Promise<T>;
	}

	// Start a new request
	const promise = fn()
		.then(
			(v) => {
				cacheSet(key, v, ttlMs);
				return v;
			},
			(err) => {
				throw err;
			}
		)
		.finally(() => {
			inflightRequests.delete(key);
		});

	inflightRequests.set(key, promise);
	return promise;
}

/**
 * Cache with stale-while-revalidate pattern and deduplication.
 * If fetch fails, returns stale data if available.
 * This is critical for handling rate limits gracefully.
 */
export async function cacheWithGracefulDegradation<T>(
	key: string,
	ttlMs: number,
	staleTtlMs: number,
	fn: () => Promise<T>
): Promise<T> {
	const hit = store.get(key);
	const now = Date.now();

	// 1. If we have fresh data, return immediately
	if (hit && now < hit.staleAt) {
		return hit.value as T;
	}

	// 2. If data is missing or hard-expired, we MUST fetch (deduplicated)
	if (!hit || now >= hit.expiresAt) {
		if (now >= (hit?.expiresAt ?? 0)) store.delete(key); // Cleanup if expired

		// Deduplication
		let promise = inflightRequests.get(key);
		if (!promise) {
			promise = fn()
				.then((v) => {
					cacheSet(key, v, ttlMs, staleTtlMs);
					return v;
				})
				.finally(() => {
					inflightRequests.delete(key);
				});
			inflightRequests.set(key, promise);
		}
		return promise as Promise<T>;
	}

	// 3. Data is STALE (staleAt <= now < expiresAt)
	// Try to refresh, but fall back to stale if it fails

	// Check if refresh is already happening
	let promise = inflightRequests.get(key);
	if (!promise) {
		promise = fn()
			.then((v) => {
				cacheSet(key, v, ttlMs, staleTtlMs);
				return v;
			})
			// If it fails, we swallow the error here because we'll return stale data
			// But we should log it
			.catch((err) => {
				console.warn(
					`[Cache] Refresh failed for ${key}, using stale data. Error: ${err.message}`
				);
				// Throwing here so the awaiter knows it failed
				throw err;
			})
			.finally(() => {
				inflightRequests.delete(key);
			});
		inflightRequests.set(key, promise);
	}

	try {
		// Wait for the refresh (optional: could return stale immediately and background refresh,
		// but for auth/permissions we often want the latest if possible, falling back only on error)
		return await (promise as Promise<T>);
	} catch {
		// Refresh failed, return stale data
		return hit.value as T;
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
