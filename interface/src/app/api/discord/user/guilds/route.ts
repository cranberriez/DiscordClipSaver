import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { filterInvitableGuilds } from "@/lib/discord/visibility";
import { getGuildsByIds } from "@/lib/db";
import { getBoolParam } from "@/lib/params";

/**
 * GET /api/discord/user/guilds
 * 
 * Get the authenticated user's Discord guilds.
 * Guilds are cached with graceful degradation:
 * - Fresh for 1 hour (normal operations)
 * - Stale for 24 hours (served when rate limited)
 * 
 * Query params:
 * - filter: "invitable" to filter guilds where user can invite bot
 * - includeDb: "1" to include database guild data
 */
export async function GET(req: NextRequest) {
    // Verify authentication and get cached guilds
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const filterParam = url.searchParams.get("filter");
    const includeDb = getBoolParam(url, "includeDb");

    // auth.userGuilds is already cached with graceful degradation (1h fresh / 24h stale)
    const guilds = auth.userGuilds;

    // Optional filtering
    const result =
        filterParam === "invitable" ? filterInvitableGuilds(guilds) : guilds;

    // Optional DB enrichment
    if (includeDb) {
        const ids = result.map(g => g.id);
        const rows = await getGuildsByIds(ids);
        return NextResponse.json({ guilds: result, dbGuilds: rows });
    }

    // Backward-compatible default
    return NextResponse.json(result);
}
