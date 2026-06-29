import { NextRequest, NextResponse } from "next/server";
import { access } from "fs/promises";
import { join } from "path";
import { sql } from "kysely";
import { withRedis } from "@/lib/redis/client";
import { fetchBotApi, getBotApiUrl } from "@/server/bot-api";
import { getDb } from "@/server/db";

type DependencyHealth = {
	ok: boolean;
	required: boolean;
	latencyMs?: number;
	error?: string;
};

function getClientIp(req: NextRequest): string | null {
	const forwardedFor = req.headers.get("x-forwarded-for");
	if (forwardedFor) {
		const first = forwardedFor.split(",")[0]?.trim();
		if (first) return first;
	}

	const realIp = req.headers.get("x-real-ip");
	if (realIp) return realIp;

	const cfIp = req.headers.get("cf-connecting-ip");
	if (cfIp) return cfIp;

	return null;
}

function isLocalhostIp(ip: string | null): boolean {
	return ip === "127.0.0.1" || ip === "::1";
}

async function getProvidedTokenFromRequest(
	req: NextRequest,
	options: { allowJsonBody: boolean }
): Promise<string | null> {
	const headerToken = req.headers.get("x-internal-token");
	if (headerToken) return headerToken;

	if (!options.allowJsonBody) return null;

	const contentType = req.headers.get("content-type") ?? "";
	if (!contentType.toLowerCase().includes("application/json")) return null;

	try {
		const body = (await req.json()) as unknown;
		if (!body || typeof body !== "object") return null;
		const token = (body as any).token ?? (body as any).apiKey;
		return typeof token === "string" ? token : null;
	} catch {
		return null;
	}
}

async function handleHealthRequest(
	req: NextRequest,
	options: { allowJsonBody: boolean }
) {
	const requiredToken = process.env.INTERNAL_HEALTH_TOKEN;
	const providedToken = await getProvidedTokenFromRequest(req, options);

	if (requiredToken && providedToken !== requiredToken) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	if (!requiredToken && process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	if (!requiredToken && process.env.NODE_ENV !== "production") {
		const ip = getClientIp(req);
		if (!isLocalhostIp(ip)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
	}

	const dependencies = {
		database: await checkDatabaseHealth(),
		redis: await checkRedisHealth(),
		botApi: await checkBotApiHealth(),
		storage: await checkStorageHealth(),
	};
	const ok = dependencies.database.ok;

	return NextResponse.json(
		{
			ok,
			dependencies,
		},
		{ status: ok ? 200 : 503 }
	);
}

async function timedCheck(
	required: boolean,
	fn: () => Promise<void>
): Promise<DependencyHealth> {
	const start = performance.now();

	try {
		await fn();
		return {
			ok: true,
			required,
			latencyMs: Math.round(performance.now() - start),
		};
	} catch (error) {
		return {
			ok: false,
			required,
			latencyMs: Math.round(performance.now() - start),
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

function checkDatabaseHealth() {
	return timedCheck(true, async () => {
		await sql`select 1`.execute(getDb());
	});
}

function checkRedisHealth() {
	return timedCheck(false, async () => {
		await withRedis(async (redis) => {
			await redis.ping();
		});
	});
}

function checkBotApiHealth() {
	if (!getBotApiUrl()) {
		return Promise.resolve({
			ok: false,
			required: false,
			error: "BOT_API_URL is not configured",
		});
	}

	return timedCheck(false, async () => {
		const response = await fetchBotApi("/health");

		if (!response.ok) {
			throw new Error(`Bot API returned ${response.status}`);
		}
	});
}

function checkStorageHealth() {
	const storagePath =
		process.env.STORAGE_PATH || join(process.cwd(), "storage");

	return timedCheck(false, async () => {
		await access(storagePath);
	});
}

export async function GET(req: NextRequest) {
	return handleHealthRequest(req, { allowJsonBody: false });
}

export async function POST(req: NextRequest) {
	return handleHealthRequest(req, { allowJsonBody: true });
}
