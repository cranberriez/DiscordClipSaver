import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { rateLimit } from "@/server/rate-limit";

/**
 * GET /api/guilds/[guildId]/channels/stats
 *
 * Fetch all channels for a guild with clip counts.
 * This endpoint is designed for TanStack Query caching.
 *
 * Requires guild access (not necessarily ownership for read).
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and guild access
	const auth = await requireGuildAccess(req, guildId);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`channel_stats:${auth.discordUserId}`,
		30,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	const channels =
		await DataService.getChannelsByGuildIdWithClipCount(guildId);

	if (!channels) {
		console.error("Channels not found, guildId: " + guildId);
		return NextResponse.json(
			{ error: "Channels not found" },
			{ status: 404 }
		);
	}

	return NextResponse.json(channels);
}
