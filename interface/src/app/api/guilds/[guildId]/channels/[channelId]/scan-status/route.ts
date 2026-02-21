/**
 * API route to get scan status for a specific channel
 * Requires guild ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { rateLimit } from "@/server/rate-limit";

// GET /api/guilds/[guildId]/channels/[channelId]/scan-status
// Returns the scan status for a specific channel
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string; channelId: string }> }
) {
	const { guildId, channelId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`scan_status:${auth.discordUserId}`,
		30,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	try {
		const status = await DataService.getScanStatusByChannelId(
			guildId,
			channelId
		);

		return NextResponse.json({ status });
	} catch (error) {
		console.error("Failed to fetch scan status:", error);
		return NextResponse.json(
			{ error: "Failed to fetch scan status" },
			{ status: 500 }
		);
	}
}
