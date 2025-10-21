import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/guilds/[guildId]/clips?channelIds=xxx,yyy&authorIds=aaa,bbb&limit=50&offset=0&sort=desc
 *
 * Get clips for a guild with pagination.
 * - If channelIds is provided: Returns clips for those specific channels (comma-separated)
 * - If authorIds is provided: Returns clips from those specific authors (comma-separated)
 * - If both omitted: Returns all clips for the guild
 * - sort: "desc" (newest first) or "asc" (oldest first), defaults to "desc"
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
    const channelIdsParam = searchParams.get("channelIds");
    const channelIds = channelIdsParam ? channelIdsParam.split(",") : null;
    const authorIdsParam = searchParams.get("authorIds");
    const authorIds = authorIdsParam ? authorIdsParam.split(",") : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = (searchParams.get("sort") || "desc") as "asc" | "desc";

    try {
        // Fetch one extra to determine if there are more results
        const clips = channelIds
            ? await DataService.getClipsByChannelIds(
                  channelIds,
                  offset,
                  limit + 1,
                  sort,
                  authorIds
              )
            : await DataService.getClipsByGuildId(
                  guildId,
                  offset,
                  limit + 1,
                  sort,
                  authorIds
              );

        if (!clips) {
            console.error(
                `Clips not found, guildId: ${guildId}${
                    channelIds ? `, channelIds: ${channelIds.join(",")}` : ""
                }`
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
