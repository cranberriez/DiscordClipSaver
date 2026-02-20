import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/guilds/[guildId]/authors/stats
 *
 * Fetch all authors for a guild with clip counts and per-channel breakdowns.
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

	const authors = await DataService.getAuthorStatsByGuildId(guildId);

	if (!authors) {
		console.error("Authors not found, guildId: " + guildId);
		return NextResponse.json(
			{ error: "Authors not found" },
			{ status: 404 }
		);
	}

	return NextResponse.json(authors);
}
