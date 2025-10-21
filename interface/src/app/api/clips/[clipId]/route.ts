import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/clips/[clipId]
 *
 * Get a single clip by ID with full metadata.
 * Verifies user has access to the guild.
 */

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    const { clipId } = await params;

    // Verify authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const clipWithMetadata = await DataService.getClipById(clipId);

        if (!clipWithMetadata) {
            return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
        }

        // Verify user has access to the guild
        const hasAccess = auth.userGuilds.some(
            g => g.id === clipWithMetadata.message.guild_id
        );

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(clipWithMetadata);
    } catch (error) {
        console.error("Failed to fetch clip:", error);
        return NextResponse.json(
            { error: "Failed to fetch clip" },
            { status: 500 }
        );
    }
}
