import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/lib/middleware/auth";
import { getClipsByChannelId, getClipCountByChannelId } from "@/lib/db/queries/clips";

/**
 * GET /api/guilds/[guildId]/clips?channelId=xxx&limit=50&offset=0
 * 
 * Get clips for a specific channel with pagination.
 * Requires user to have access to the guild.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and guild access
    const auth = await requireGuildAccess(req, guildId);
    if (auth instanceof NextResponse) return auth;

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!channelId) {
        return NextResponse.json(
            { error: "channelId is required" },
            { status: 400 }
        );
    }

    try {
        const [clips, totalCount] = await Promise.all([
            getClipsByChannelId(channelId, limit, offset),
            getClipCountByChannelId(channelId),
        ]);

        return NextResponse.json({
            clips,
            pagination: {
                limit,
                offset,
                total: totalCount,
                hasMore: offset + limit < totalCount,
            },
        });
    } catch (error) {
        console.error("Failed to fetch clips:", error);
        return NextResponse.json(
            { error: "Failed to fetch clips" },
            { status: 500 }
        );
    }
}
