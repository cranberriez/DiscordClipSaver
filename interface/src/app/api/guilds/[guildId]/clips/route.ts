import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/guilds/[guildId]/clips?channelId=xxx&limit=50&offset=0
 *
 * Get clips for a guild with pagination.
 * - If channelId is provided: Returns clips for that specific channel
 * - If channelId is omitted: Returns all clips for the guild (all channels)
 * 
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

    try {
        // Fetch one extra to determine if there are more results
        const clips = channelId
            ? await DataService.getClipsByChannelId(
                  channelId,
                  offset,
                  limit + 1
              )
            : await DataService.getClipsByGuildId(
                  guildId,
                  offset,
                  limit + 1
              );

        if (!clips) {
            console.error(
                `Clips not found, guildId: ${guildId}${channelId ? `, channelId: ${channelId}` : ""}`
            );
            return NextResponse.json(
                { error: "Clips not found" },
                { status: 404 }
            );
        }

        // Check if there are more results
        const hasMore = clips.length > limit;
        const clipsToReturn = hasMore ? clips.slice(0, limit) : clips;

        return NextResponse.json({
            clips: clipsToReturn,
            pagination: {
                limit,
                offset,
                total: offset + clipsToReturn.length + (hasMore ? 1 : 0), // Approximate total
                hasMore,
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
