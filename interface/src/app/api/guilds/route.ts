import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { getGuildsByIds } from "@/lib/db/queries/guilds";

/**
 * GET /api/guilds
 * 
 * Get all guilds that exist in our database and the user has access to.
 * Returns guilds sorted by name.
 */
export async function GET(req: NextRequest) {
    // Verify authentication and get user's Discord guilds
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        // Get Discord guild IDs user has access to
        const discordGuildIds = auth.userGuilds.map((g) => g.id);

        // Get guilds that exist in our database
        const dbGuilds = await getGuildsByIds(discordGuildIds);

        return NextResponse.json({ guilds: dbGuilds });
    } catch (error) {
        console.error("Failed to fetch guilds:", error);
        return NextResponse.json(
            { error: "Failed to fetch guilds" },
            { status: 500 }
        );
    }
}
