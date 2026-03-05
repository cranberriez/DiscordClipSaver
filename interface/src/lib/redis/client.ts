/**
 * Redis client for job queue management
 * Interface is a producer only - does not consume jobs
 */
import "server-only";
import Redis from "ioredis";

type RedisSingleton = Redis & {
	_isInitialized?: boolean;
	_hasEventListeners?: boolean;
};

export class RedisUnavailableError extends Error {
	retryAfterSeconds: number;

	constructor(message: string, retryAfterSeconds: number) {
		super(message);
		this.name = "RedisUnavailableError";
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

const globalForRedis = globalThis as unknown as {
	redis?: RedisSingleton;
	nextConnectAttemptAt?: number;
	currentBackoffMs?: number;
	consecutiveConnectFailures?: number;
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
		const backoffInitialMs = Number.parseFloat(
			process.env.REDIS_CONNECT_BACKOFF_INITIAL_SECONDS || "0.5"
		);
		const backoffMaxMs = Number.parseFloat(
			process.env.REDIS_CONNECT_BACKOFF_MAX_SECONDS || "30"
		);
		const backoffMultiplier = Number.parseFloat(
			process.env.REDIS_CONNECT_BACKOFF_MULTIPLIER || "2"
		);
		const connectTimeoutMs = Math.floor(
			Number.parseFloat(
				process.env.REDIS_CONNECT_TIMEOUT_SECONDS || "2"
			) * 1000
		);
		const maxAttempts = Math.max(
			1,
			Number.parseInt(process.env.REDIS_CONNECT_MAX_ATTEMPTS || "5", 10)
		);

		globalForRedis.currentBackoffMs = backoffInitialMs * 1000;
		globalForRedis.nextConnectAttemptAt = 0;
		globalForRedis.consecutiveConnectFailures = 0;

		const redis = new Redis(redisUrl, {
			// Avoid hanging API handlers when Redis is down.
			connectTimeout: connectTimeoutMs,
			maxRetriesPerRequest: 1,
			enableReadyCheck: true,
			// Only connect when we actually need Redis.
			lazyConnect: true,
			// If Redis is down, fail fast rather than buffering commands.
			enableOfflineQueue: false,
			// Prevent infinite reconnect loops when Redis is unavailable.
			retryStrategy: (times) => {
				if (times >= maxAttempts) return null;
				const base = Math.max(
					1,
					globalForRedis.currentBackoffMs ?? backoffInitialMs * 1000
				);
				const delay = Math.min(base, backoffMaxMs * 1000);
				globalForRedis.nextConnectAttemptAt = Date.now() + delay;
				globalForRedis.currentBackoffMs = Math.min(
					base * backoffMultiplier,
					backoffMaxMs * 1000
				);
				return delay;
			},
		}) as RedisSingleton;

		if (!redis._hasEventListeners) {
			// Prevent Node from treating Redis connection issues as an unhandled EventEmitter error.
			// Intentionally low-noise: we rely on withRedis() + retryStrategy for control flow.
			redis.on("error", (err) => {
				console.warn("Redis client error:", err?.message || err);
			});
			redis.on("end", () => {
				console.warn("Redis connection ended");
			});
			redis.on("close", () => {
				console.warn("Redis connection closed");
			});
			redis._hasEventListeners = true;
		}

		redis.on("ready", () => {
			globalForRedis.consecutiveConnectFailures = 0;
			globalForRedis.currentBackoffMs = backoffInitialMs * 1000;
			globalForRedis.nextConnectAttemptAt = 0;
		});

		redis._isInitialized = true;
		globalForRedis.redis = redis;
	}

	return globalForRedis.redis;
}

export async function withRedis<T>(
	fn: (redis: Redis) => Promise<T>
): Promise<T> {
	const redis = getRedis();

	const now = Date.now();
	const nextAttempt = globalForRedis.nextConnectAttemptAt ?? 0;
	if (nextAttempt && now < nextAttempt) {
		throw new RedisUnavailableError(
			"Redis unavailable",
			Math.max(0, (nextAttempt - now) / 1000)
		);
	}

	if (redis.status !== "ready") {
		try {
			await redis.connect();
		} catch {
			const retryAfterSeconds = Math.max(
				0,
				((globalForRedis.nextConnectAttemptAt ?? Date.now()) -
					Date.now()) /
					1000
			);
			throw new RedisUnavailableError(
				"Redis unavailable",
				retryAfterSeconds
			);
		}
	}

	return fn(redis);
}

export const redis = getRedis();
