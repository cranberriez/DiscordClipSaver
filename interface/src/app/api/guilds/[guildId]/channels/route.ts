import { NextRequest, NextResponse } from "next/server";
import { tryGetAuthInfo } from "@/lib/auth";
import { getSingleGuildById, getChannelsByGuildId } from "@/lib/db";

/**
 * GET /api/guilds/[guildId]/channels
 * 
 * Get all channels for a guild.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication
    const authInfo = await tryGetAuthInfo(req);
    if (!authInfo) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify guild exists and user has access
    const guild = await getSingleGuildById(guildId);
    if (!guild) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Verify user owns this guild
    if (guild.owner_id !== authInfo.discordUserId) {
        return NextResponse.json(
            { error: "Forbidden: You do not own this guild" },
            { status: 403 }
        );
    }

    // Get all channels for this guild
    try {
        const channels = await getChannelsByGuildId(guildId);

        return NextResponse.json({ channels });
    } catch (error) {
        console.error("Failed to fetch channels:", error);
        return NextResponse.json(
            { error: "Failed to fetch channels" },
            { status: 500 }
        );
    }
}
