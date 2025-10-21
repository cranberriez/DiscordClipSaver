import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/guilds/[guildId]
 *
 * Get a single guild by ID.
 * Requires guild access (ownership).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and ownership
    const auth = await requireGuildAccess(req, guildId, true);
    if (auth instanceof NextResponse) return auth;

    try {
        const guild = await DataService.getSingleGuildById(guildId);

        if (!guild) {
            return NextResponse.json(
                { error: "Guild not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(guild);
    } catch (error) {
        console.error("Failed to fetch guild:", error);
        return NextResponse.json(
            { error: "Failed to fetch guild" },
            { status: 500 }
        );
    }
}
