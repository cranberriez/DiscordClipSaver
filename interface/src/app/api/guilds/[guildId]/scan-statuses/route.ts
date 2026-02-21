/**
 * API route to get scan statuses for all channels in a guild
 * Returns only scan statuses (not channels)
 * Requires guild ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { rateLimit } from "@/server/rate-limit";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`scan_statuses:${auth.discordUserId}`,
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
		// Returns only scan statuses for channels that have been scanned
		const statuses = await DataService.getScanStatusesByGuildId(guildId);

		return NextResponse.json(statuses);
	} catch (error) {
		console.error("Failed to fetch scan statuses:", error);
		return NextResponse.json(
			{ error: "Failed to fetch scan statuses" },
			{ status: 500 }
		);
	}
}
