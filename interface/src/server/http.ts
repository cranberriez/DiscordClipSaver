import "server-only";
import { NextResponse } from "next/server";

function isDbUnavailableError(err: any): boolean {
	if (!err) return false;
	if (err?.code === "ECONNREFUSED") return true;
	if (err?.code === "57P01") return true; // admin_shutdown
	if (err?.code === "57P03") return true; // cannot_connect_now
	if (err?.code === "53300") return true; // too_many_connections
	if (err?.code === "ETIMEDOUT") return true;

	// pg can wrap connection failures in AggregateError in some environments
	if (err instanceof AggregateError) {
		return (err as any).errors?.some(isDbUnavailableError) ?? false;
	}

	// Some errors are nested (cause)
	if (err?.cause) return isDbUnavailableError(err.cause);

	return false;
}

function isRedisUnavailableError(err: any): boolean {
	if (!err) return false;
	if (err?.name === "RedisUnavailableError") return true;
	if (err?.message === "Redis unavailable") return true;
	return false;
}

export function jsonError(err: any, fallbackStatus = 500) {
	let status = typeof err?.status === "number" ? err.status : fallbackStatus;
	const body: any = { error: err?.message ?? "Unexpected error" };

	if (isDbUnavailableError(err)) {
		status = 503;
		body.error = "Service temporarily unavailable";
		body.code = "DB_UNAVAILABLE";
		body.userMessage =
			"Server-side database error. Please try again. If this keeps happening, please report it.";
	}

	if (isRedisUnavailableError(err)) {
		status = 503;
		body.error = "Service temporarily unavailable";
		body.code = "REDIS_UNAVAILABLE";
		body.userMessage =
			"Server-side cache/queue error. Please try again. If this keeps happening, please report it.";
		if (typeof err?.retryAfterSeconds === "number") {
			body.retryAfterSeconds = err.retryAfterSeconds;
		}
	}

	if (status === 429 && err?.retryAfter) body.retryAfter = err.retryAfter;
	return NextResponse.json(body, { status });
}
