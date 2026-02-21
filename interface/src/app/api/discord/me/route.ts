import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { getCurrentUser } from "@/server/discord/discordClient";
import { getUserByDiscordId } from "@/server/db";
import { cacheUserScopedGraceful } from "@/server/cache";
import { rateLimit } from "@/server/rate-limit";

/**
 * GET /api/discord/me
 *
 * Get the authenticated user's Discord profile information.
 * Returns both Discord API data and local database user data.
 * Data is cached with graceful degradation.
 */
export async function GET(req: NextRequest) {
	// Verify authentication and get access token
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	const { discordUserId, accessToken } = auth;

	if (!accessToken) {
		return NextResponse.json(
			{ error: "Missing Discord access token" },
			{ status: 401 }
		);
	}

	// Rate Limit: 60 requests per minute
	const limitResult = await rateLimit(
		`discord_me:${discordUserId}`,
		60,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	try {
		// Fetch Discord user profile with caching
		// User profile data is relatively static, so cache aggressively:
		// - Fresh for 1 hour (normal operations)
		// - Stale for 24 hours (serve when rate limited)
		const freshTtlMs = 60 * 60 * 1000; // 1 hour
		const staleTtlMs = 24 * 60 * 60 * 1000; // 24 hours

		const discordUser = await cacheUserScopedGraceful(
			discordUserId,
			"discord:user",
			freshTtlMs,
			staleTtlMs,
			() => getCurrentUser(accessToken)
		);

		// Fetch local database user data
		const dbUser = await getUserByDiscordId(discordUserId);

		return NextResponse.json({
			discord: discordUser,
			database: dbUser,
		});
	} catch (error: any) {
		console.error("Failed to fetch Discord user data:", error);

		return NextResponse.json(
			{ error: "Failed to fetch user data" },
			{ status: 500 }
		);
	}
}
