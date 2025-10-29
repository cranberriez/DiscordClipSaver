import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/clips/[clipId]
 *
 * Get a single clip by ID with full metadata and favorites status.
 * Securely verifies user has access to the guild before fetching clip data.
 * 
 * Security: This route first checks guild access using minimal queries,
 * then fetches the full clip data only if authorized.
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
        // Security: Get only the guild_id for permission check (minimal query)
        // This prevents data leakage before authorization
        const clipGuildId = await DataService.getClipGuildId(clipId);
        
        if (!clipGuildId) {
            return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
        }

        // Verify user has access to the guild BEFORE fetching full data
        const hasAccess = auth.userGuilds.some(g => g.id === clipGuildId);

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Now fetch full clip data with favorites support since user is authorized
        const clipWithMetadata = await DataService.getClipById(clipId, auth.discordUserId);

        if (!clipWithMetadata) {
            // This shouldn't happen since we found the clip above, but handle gracefully
            return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
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
