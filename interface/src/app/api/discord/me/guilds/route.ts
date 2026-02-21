import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { rateLimit } from "@/server/rate-limit";

/**
 * GET /api/discord/me/guilds
 *
 * Get the authenticated user's Discord guilds.
 * Guilds are cached with graceful degradation:
 * - Fresh for 1 hour (normal operations)
 * - Stale for 24 hours (served when rate limited)
 *
 * Query params:
 * - includeDB: "1" to include DB enrichment
 */
export async function GET(req: NextRequest) {
	// Returns DiscordGuild[]
	// Verify authentication and get cached guilds
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`discord_guilds:${auth.discordUserId}`,
		30,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	const url = new URL(req.url);
	const includeDBParam = url.searchParams.get("includeDB");

	// auth.userGuilds is already cached with graceful degradation (1h fresh / 24h stale)
	const discordGuilds = auth.userGuilds;

	// If includeDB is not set, return raw Discord guilds
	if (includeDBParam !== "1") {
		return NextResponse.json(discordGuilds);
	}

	// Add additional DB data
	const dbGuilds = await DataService.getGuildsByIds(
		discordGuilds.map((g) => g.id)
	);

	// Return Discord guilds with DB data
	return NextResponse.json(
		discordGuilds.map((g) => {
			return {
				...g,
				db: dbGuilds?.find((dbGuild) => dbGuild.id === g.id) ?? null,
			};
		})
	);
}
