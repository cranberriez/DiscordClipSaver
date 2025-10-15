/**
 * API route to get scan statuses for all channels in a guild
 * Returns only scan statuses (not channels)
 * Requires guild ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/lib/middleware/auth";
import { getGuildScanStatuses } from "@/lib/db/queries/scan_status";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and ownership
    const auth = await requireGuildAccess(req, guildId, true);
    if (auth instanceof NextResponse) return auth;

    try {
        // Returns only scan statuses for channels that have been scanned
        const statuses = await getGuildScanStatuses(guildId);

        return NextResponse.json({ statuses });
    } catch (error) {
        console.error("Failed to fetch scan statuses:", error);
        return NextResponse.json(
            { error: "Failed to fetch scan statuses" },
            { status: 500 }
        );
    }
}
