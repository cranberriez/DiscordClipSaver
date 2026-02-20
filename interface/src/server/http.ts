import "server-only";
import { NextResponse } from "next/server";

export function jsonError(err: any, fallbackStatus = 500) {
	const status =
		typeof err?.status === "number" ? err.status : fallbackStatus;
	const body: any = { error: err?.message ?? "Unexpected error" };
	if (status === 429 && err?.retryAfter) body.retryAfter = err.retryAfter;
	return NextResponse.json(body, { status });
}
