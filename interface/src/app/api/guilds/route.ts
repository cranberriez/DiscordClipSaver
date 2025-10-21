import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import type { GuildResponse } from "@/lib/api/guild";

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

    const includePerms = req.nextUrl.searchParams.get("includePerms");

    try {
        // Get Discord guild IDs user has access to
        const discordGuildIds = auth.userGuilds.map(g => g.id);

        // Get guilds that exist in our database
        const dbGuilds = await DataService.getGuildsByIds(discordGuildIds);

        if (!dbGuilds) {
            return NextResponse.json([]);
        }

        if (includePerms) {
            // Build a permissions map (guildId -> permissions as string)
            const permsByGuildId = new Map<string, string>();
            for (const g of auth.userGuilds) {
                let permsStr = "0";
                try {
                    permsStr = g.permissions
                        ? BigInt(g.permissions).toString()
                        : "0";
                } catch {
                    permsStr = "0";
                }
                permsByGuildId.set(g.id, permsStr);
            }

            // Enrich DB guilds with user's Discord permissions and return as array
            const enriched: GuildResponse[] = dbGuilds.map(g => ({
                ...g,
                permissions: permsByGuildId.get(g.id) ?? "0",
            }));

            return NextResponse.json(enriched);
        }

        return NextResponse.json(dbGuilds);
    } catch (error) {
        console.error("Failed to fetch guilds:", error);
        return NextResponse.json(
            { error: "Failed to fetch guilds" },
            { status: 500 }
        );
    }
}
