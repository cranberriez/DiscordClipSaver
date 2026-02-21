import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { rateLimit } from "@/server/rate-limit";

/**
 * GET /api/guilds/stats?guildIds=xxx,yyy&withClipCount=1&withAuthorCount=1
 *
 * Fetch stats for multiple guilds.
 * Only returns stats for guilds the user has access to.
 *
 * Query Parameters:
 * - guildIds: Comma-separated list of guild IDs (required)
 * - withClipCount: Include clip count (0 or 1, optional)
 * - withAuthorCount: Include author count (0 or 1, optional)
 *
 * Authorization: User must have access to the guilds via Discord
 */
export async function GET(req: NextRequest) {
	// Verify authentication and get user's guilds
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 20 requests per minute
	const limitResult = await rateLimit(
		`guilds_stats:${auth.discordUserId}`,
		20,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	// Parse query parameters
	const { searchParams } = new URL(req.url);
	const guildIdsParam = searchParams.get("guildIds");
	const withClipCount = searchParams.get("withClipCount") === "1";
	const withAuthorCount = searchParams.get("withAuthorCount") === "1";

	if (!guildIdsParam) {
		return NextResponse.json(
			{ error: "guildIds parameter is required" },
			{ status: 400 }
		);
	}

	const requestedGuildIds = guildIdsParam.split(",").filter(Boolean);

	if (requestedGuildIds.length === 0) {
		return NextResponse.json(
			{ error: "At least one guild ID is required" },
			{ status: 400 }
		);
	}

	// Filter to only guilds the user has access to
	const userGuildIds = new Set(auth.userGuilds.map((g) => g.id));
	const authorizedGuildIds = requestedGuildIds.filter((id) =>
		userGuildIds.has(id)
	);

	if (authorizedGuildIds.length === 0) {
		return NextResponse.json(
			{ error: "No access to requested guilds" },
			{ status: 403 }
		);
	}

	// Fetch guild stats
	const guilds = await DataService.getGuildsByIdsWithStats(
		authorizedGuildIds,
		{
			withClipCount,
			withAuthorCount,
		}
	);

	if (!guilds) {
		return NextResponse.json(
			{ error: "Failed to fetch guild stats" },
			{ status: 500 }
		);
	}

	return NextResponse.json(guilds);
}
