import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { toggleFavorite } from "@/server/db";

/**
 * GET /api/clips/[clipId]/favorite
 * 
 * Check if a clip is favorited by the current user.
 * Returns { isFavorited: boolean }
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
        // Security: Check guild access first
        const clipGuildId = await DataService.getClipGuildId(clipId);
        
        if (!clipGuildId) {
            return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
        }

        // Verify user has access to the guild
        const hasAccess = auth.userGuilds.some(g => g.id === clipGuildId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get favorite status
        const clip = await DataService.getClipById(clipId, auth.discordUserId);
        
        return NextResponse.json({
            isFavorited: clip?.isFavorited || false
        });
    } catch (error) {
        console.error("Failed to check favorite status:", error);
        return NextResponse.json(
            { error: "Failed to check favorite status" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/clips/[clipId]/favorite
 * 
 * Add clip(s) to favorites. Supports both single clip and bulk operations.
 * Body: { clipIds?: string[] } - if provided, favorites multiple clips
 * If clipIds not provided, uses the clipId from the URL
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    const { clipId } = await params;

    // Verify authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await req.json().catch(() => ({}));
        const clipIds = body.clipIds || [clipId];

        // Validate clipIds array
        if (!Array.isArray(clipIds) || clipIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid clipIds array" },
                { status: 400 }
            );
        }

        // Security: Verify user has access to all clips' guilds
        const guildChecks = await Promise.all(
            clipIds.map(async (id: string) => {
                const guildId = await DataService.getClipGuildId(id);
                return { clipId: id, guildId };
            })
        );

        // Check if any clips don't exist
        const missingClips = guildChecks.filter(check => !check.guildId);
        if (missingClips.length > 0) {
            return NextResponse.json(
                { 
                    error: "Some clips not found",
                    missingClips: missingClips.map(c => c.clipId)
                },
                { status: 404 }
            );
        }

        // Check guild access for all clips
        const unauthorizedClips = guildChecks.filter(check => 
            !auth.userGuilds.some(g => g.id === check.guildId)
        );

        if (unauthorizedClips.length > 0) {
            return NextResponse.json(
                { 
                    error: "Access denied to some clips",
                    unauthorizedClips: unauthorizedClips.map(c => c.clipId)
                },
                { status: 403 }
            );
        }

        // Add to favorites (toggleFavorite will add if not already favorited)
        const results = await Promise.allSettled(
            clipIds.map((id: string) => toggleFavorite(id, auth.discordUserId))
        );

        // Count successful operations
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return NextResponse.json({
            success: true,
            added: successful,
            failed: failed,
            clipIds: clipIds
        });

    } catch (error) {
        console.error("Failed to add favorites:", error);
        return NextResponse.json(
            { error: "Failed to add favorites" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/clips/[clipId]/favorite
 * 
 * Remove clip(s) from favorites. Supports both single clip and bulk operations.
 * Body: { clipIds?: string[] } - if provided, removes multiple clips
 * If clipIds not provided, uses the clipId from the URL
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    const { clipId } = await params;

    // Verify authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await req.json().catch(() => ({}));
        const clipIds = body.clipIds || [clipId];

        // Validate clipIds array
        if (!Array.isArray(clipIds) || clipIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid clipIds array" },
                { status: 400 }
            );
        }

        // For DELETE, we can be more lenient - just remove favorites that exist
        // No need to check guild access since we're only removing user's own favorites
        const results = await Promise.allSettled(
            clipIds.map((id: string) => toggleFavorite(id, auth.discordUserId))
        );

        // Count successful operations
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return NextResponse.json({
            success: true,
            removed: successful,
            failed: failed,
            clipIds: clipIds
        });

    } catch (error) {
        console.error("Failed to remove favorites:", error);
        return NextResponse.json(
            { error: "Failed to remove favorites" },
            { status: 500 }
        );
    }
}
