import { NextRequest, NextResponse } from "next/server";

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

	return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(req: NextRequest) {
	return handleHealthRequest(req, { allowJsonBody: false });
}

export async function POST(req: NextRequest) {
	return handleHealthRequest(req, { allowJsonBody: true });
}
