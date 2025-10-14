import { NextRequest, NextResponse } from "next/server";
import { getAuthInfo } from "@/lib/auth";
import { cacheUserScoped } from "@/lib/cache";
import { filterInvitableGuilds } from "@/lib/discord/visibility";
import { getGuildsByIds } from "@/lib/db";
import { discordFetch } from "@/lib/discord/discordClient";
import { getBoolParam } from "@/lib/params";
import { jsonError } from "@/lib/http";
import type { DiscordGuild } from "@/lib/discord/types";

export async function GET(req: NextRequest) {
	// Auth and token (server-side only)
	let auth;
	try {
		auth = await getAuthInfo(req);
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const { discordUserId, accessToken } = auth;
	if (!accessToken) return NextResponse.json({ error: "Missing Discord token" }, { status: 401 });

	const url = new URL(req.url);
	const filterParam = url.searchParams.get("filter");
	const includeDb = getBoolParam(url, "includeDb");

	// Fetch with user-scoped cache
	const ttlMs = 2 * 60 * 1000; // 2 minutes
	let guilds: DiscordGuild[];
	try {
		guilds = await cacheUserScoped<DiscordGuild[]>(discordUserId, "discord:guilds", ttlMs, () =>
			discordFetch<DiscordGuild[]>("/users/@me/guilds", accessToken)
		);
	} catch (err: any) {
		return jsonError(err, 502);
	}

	// Optional filtering
	const result = filterParam === "invitable" ? filterInvitableGuilds(guilds) : guilds;

	// Optional DB enrichment
	if (includeDb) {
		const ids = result.map((g) => g.id);
		const rows = await getGuildsByIds(ids);
		return NextResponse.json({ guilds: result, dbGuilds: rows });
	}

	// Backward-compatible default
	return NextResponse.json(result);
}
