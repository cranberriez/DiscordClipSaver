/**
 * API route to get scan statuses for all channels in a guild
 * Returns all channels with their scan status (or null if never scanned)
 */
import { NextRequest, NextResponse } from "next/server";
import { getChannelScanStatusesWithInfo } from "@/lib/db/queries/scan_status";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    try {
        const { guildId } = await params;

        // Returns all channels with scan status joined
        // Channels without scan status will have null status
        const channels = await getChannelScanStatusesWithInfo(guildId);

        return NextResponse.json({ channels });
    } catch (error) {
        console.error("Failed to fetch scan statuses:", error);
        return NextResponse.json(
            { error: "Failed to fetch scan statuses" },
            { status: 500 }
        );
    }
}
