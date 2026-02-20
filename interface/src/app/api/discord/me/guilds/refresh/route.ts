import { NextRequest, NextResponse } from "next/server";
import { cacheSet } from "@/server/cache";
import { requireAuth } from "@/server/middleware/auth";
import { discordFetch, DiscordAPIError } from "@/server/discord/discordClient";
import type { DiscordGuild } from "@/server/discord/types";

// POST /api/discord/guilds/refresh
// Forces a fresh fetch of the user's Discord guilds and updates the server cache.
export async function POST(req: NextRequest) {
	try {
		// Standard auth middleware (consistent with other API routes)
		const auth = await requireAuth(req);
		if (auth instanceof NextResponse) return auth;

		const { discordUserId, accessToken } = auth;

		// Fetch latest guilds directly from Discord (bypass cache)
		const guilds = await discordFetch<DiscordGuild[]>(
			"/users/@me/guilds",
			accessToken!
		);

		// Update cache with the same TTLs used elsewhere (fresh: 1h, stale: 24h)
		const freshTtlMs = 60 * 60 * 1000; // 1 hour
		const staleTtlMs = 24 * 60 * 60 * 1000; // 24 hours
		const cacheKey = `user:${discordUserId}:discord:guilds`;
		cacheSet(cacheKey, guilds, freshTtlMs, staleTtlMs);

		return NextResponse.json({ guilds }, { status: 200 });
	} catch (err: any) {
		if (err instanceof DiscordAPIError) {
			if (err.status === 429) {
				return NextResponse.json(
					{
						error: "Discord rate limit exceeded after retries. Please try again in a moment.",
						retryAfter: err.retryAfter,
					},
					{ status: 429 }
				);
			}
			if (err.status === 401 || err.status === 403) {
				return NextResponse.json(
					{
						error: "Discord authorization failed. Please sign in again.",
					},
					{ status: 401 }
				);
			}
		}

		console.error("Failed to refresh Discord guilds:", err);
		return NextResponse.json(
			{ error: "Failed to refresh Discord guilds" },
			{ status: 502 }
		);
	}
}
