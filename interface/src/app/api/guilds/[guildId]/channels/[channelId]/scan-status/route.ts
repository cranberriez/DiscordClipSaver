/**
 * API route to get scan status for a specific channel
 */
import { NextRequest, NextResponse } from "next/server";
import { getChannelScanStatus } from "@/lib/db/queries/scan_status";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string; channelId: string }> }
) {
    try {
        const { guildId, channelId } = await params;

        const status = await getChannelScanStatus(guildId, channelId);

        return NextResponse.json({ status });
    } catch (error) {
        console.error("Failed to fetch scan status:", error);
        return NextResponse.json(
            { error: "Failed to fetch scan status" },
            { status: 500 }
        );
    }
}
