/**
 * API route to get scan status for a specific channel
 * Requires guild ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

// GET /api/guilds/[guildId]/channels/[channelId]/scan-status
// Returns the scan status for a specific channel
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string; channelId: string }> }
) {
    const { guildId, channelId } = await params;

    // Verify authentication and ownership
    const auth = await requireGuildAccess(req, guildId, true);
    if (auth instanceof NextResponse) return auth;

    try {
        const status = await DataService.getScanStatusByChannelId(
            guildId,
            channelId
        );

        return NextResponse.json({ status });
    } catch (error) {
        console.error("Failed to fetch scan status:", error);
        return NextResponse.json(
            { error: "Failed to fetch scan status" },
            { status: 500 }
        );
    }
}
