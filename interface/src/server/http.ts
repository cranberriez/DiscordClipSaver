import "server-only";
import { NextResponse } from "next/server";

// ============================================================================
// Standard API error envelope
//
// Every non-2xx JSON response should have this shape (see docs/ERROR_HANDLING.md):
//   {
//     error:       string   - short, log-friendly message
//     code:        string   - stable machine-readable code (SCREAMING_SNAKE)
//     userMessage: string   - safe to render directly in the UI
//     details?:    object   - optional structured context (ids, fields, ...)
//     retryAfter?: number   - seconds, present on 429/503 when known
//   }
// ============================================================================

export type ApiErrorCode =
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CHANNEL_NOT_FOUND"
	| "CLIP_NOT_FOUND"
	| "GUILD_NOT_FOUND"
	| "VALIDATION_ERROR"
	| "RATE_LIMITED"
	| "PAYLOAD_TOO_LARGE"
	| "INVALID_ORIGIN"
	| "DB_UNAVAILABLE"
	| "REDIS_UNAVAILABLE"
	| "QUEUE_UNAVAILABLE"
	| "UPSTREAM_ERROR"
	| "INTERNAL_ERROR";

/**
 * Throwable error carrying the full standard envelope.
 * Route handlers can throw it anywhere; a catch-all `jsonError(err)` at the
 * bottom of the handler turns it into the right response.
 */
export class ApiError extends Error {
	constructor(
		public status: number,
		public code: ApiErrorCode,
		message: string,
		public userMessage: string = message,
		public details?: Record<string, unknown>
	) {
		super(message);
		this.name = "ApiError";
	}
}

/** Build a standard error response directly (when not throwing). */
export function apiError(
	status: number,
	code: ApiErrorCode,
	error: string,
	userMessage: string = error,
	details?: Record<string, unknown>
) {
	const body: Record<string, unknown> = { error, code, userMessage };
	if (details) body.details = details;
	return NextResponse.json(body, { status });
}

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

export function isRedisUnavailableError(err: any): boolean {
	if (!err) return false;
	if (err?.name === "RedisUnavailableError") return true;
	if (err?.message === "Redis unavailable") return true;
	return false;
}

export function queueUnavailableResponse(err: any) {
	const body: any = {
		error: "Queue temporarily unavailable",
		code: "QUEUE_UNAVAILABLE",
		userMessage:
			"Background jobs are temporarily unavailable. Please try again after Redis is back online.",
	};

	if (typeof err?.retryAfterSeconds === "number") {
		body.retryAfterSeconds = err.retryAfterSeconds;
	}

	return NextResponse.json(body, { status: 503 });
}

export function jsonError(err: any, fallbackStatus = 500) {
	// First-class ApiError: emit its envelope as-is
	if (err instanceof ApiError) {
		return apiError(
			err.status,
			err.code,
			err.message,
			err.userMessage,
			err.details
		);
	}

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
