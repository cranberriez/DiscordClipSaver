import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { getDb } from "@/server/db";

/**
 * PATCH /api/clips/[clipId]/visibility
 *
 * Update clip visibility.
 * Permission: Clip Owner OR Guild Owner
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    const { clipId } = await params;
    const auth = await requireAuth(req);

    if (auth instanceof NextResponse) return auth;

    try {
        const body = await req.json();
        const { visibility } = body;

        if (!["PUBLIC", "UNLISTED", "PRIVATE"].includes(visibility)) {
            return NextResponse.json(
                { error: "Invalid visibility option" },
                { status: 400 }
            );
        }

        // Fetch clip to verify ownership
        const clip = await DataService.getClipById(clipId, auth.discordUserId);
        if (!clip) {
            return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
        }

        // Fetch guild to check owner
        const guild = await DataService.getSingleGuildById(clip.clip.guild_id);
        if (!guild) {
            return NextResponse.json(
                { error: "Guild not found" },
                { status: 404 }
            );
        }

        const isClipOwner = clip.message.author_id === auth.discordUserId;
        const isGuildOwner = guild.owner_id === auth.discordUserId;

        if (!isClipOwner && !isGuildOwner) {
            return NextResponse.json(
                { error: "Permission denied" },
                { status: 403 }
            );
        }

        // Update visibility
        await getDb()
            .updateTable("clip")
            .set({ visibility })
            .where("id", "=", clipId)
            .execute();

        return NextResponse.json({ success: true, visibility });
    } catch (error) {
        console.error("Failed to update clip visibility:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
