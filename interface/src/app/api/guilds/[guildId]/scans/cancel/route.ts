import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGuildAccess } from "@/server/middleware/auth";
import { rateLimit } from "@/server/rate-limit";
import { DataService } from "@/server/services/data-service";

const CancelScanSchema = z.object({
	channelId: z.string(),
});

/**
 * POST /api/guilds/[guildId]/scans/cancel
 * Cancel a scan for a specific channel
 * Requires guild ownership.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 10 requests per minute per user
	const limitResult = await rateLimit(
		`cancel-scan:${auth.discordUserId}`,
		10,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{
				error: "Rate limit exceeded. Please wait before cancelling more scans.",
				retryAfter: Math.ceil((limitResult.reset - Date.now()) / 1000),
			},
			{ status: 429 }
		);
	}

	// Parse request body
	let body;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body" },
			{ status: 400 }
		);
	}

	// Validate request body
	const parseResult = CancelScanSchema.safeParse(body);
	if (!parseResult.success) {
		return NextResponse.json(
			{
				error: "Invalid request body",
				details: parseResult.error.issues,
			},
			{ status: 400 }
		);
	}

	const { channelId } = parseResult.data;

	try {
		// Cancel the scan by setting status to CANCELLED
		const cancelledScan = await DataService.cancelChannelScan(
			guildId,
			channelId
		);

		if (!cancelledScan) {
			return NextResponse.json(
				{ error: "Scan not found or already completed" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			scan: cancelledScan,
		});
	} catch (error) {
		console.error("Cancel scan error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
