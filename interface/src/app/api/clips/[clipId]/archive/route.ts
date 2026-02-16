import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { getDb } from "@/server/db";

/**
 * POST /api/clips/[clipId]/archive
 *
 * Archive a clip (soft delete).
 * Permission: Guild Owner Only
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    const { clipId } = await params;
    const auth = await requireAuth(req);

    if (auth instanceof NextResponse) return auth;

    try {
        // Fetch clip
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

        const isGuildOwner = guild.owner_id === auth.discordUserId;

        if (!isGuildOwner) {
            return NextResponse.json(
                { error: "Permission denied. Only server owner can archive clips." },
                { status: 403 }
            );
        }

        // Archive (soft delete)
        await getDb()
            .updateTable("clip")
            .set({ deleted_at: new Date() })
            .where("id", "=", clipId)
            .execute();

        return NextResponse.json({ success: true, status: "archived" });
    } catch (error) {
        console.error("Failed to archive clip:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/clips/[clipId]/archive
 *
 * Unarchive a clip (restore).
 * Permission: Guild Owner Only
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    const { clipId } = await params;
    const auth = await requireAuth(req);

    if (auth instanceof NextResponse) return auth;

    try {
         // Fetch clip - we need to fetch even if deleted (DataService might filter deleted, so we use direct DB query or update DataService)
         // Actually DataService.getClipById filters deleted clips by default.
         // We need a way to get the clip even if deleted to verify ownership.
         
         const clipResult = await getDb()
            .selectFrom("clip")
            .select(["guild_id"])
            .where("id", "=", clipId)
            .executeTakeFirst();

        if (!clipResult) {
             return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
        }

        // Fetch guild to check owner
        const guild = await DataService.getSingleGuildById(clipResult.guild_id);
        if (!guild) {
            return NextResponse.json(
                { error: "Guild not found" },
                { status: 404 }
            );
        }

        const isGuildOwner = guild.owner_id === auth.discordUserId;

        if (!isGuildOwner) {
            return NextResponse.json(
                { error: "Permission denied. Only server owner can unarchive clips." },
                { status: 403 }
            );
        }

        // Unarchive (restore)
        await getDb()
            .updateTable("clip")
            .set({ deleted_at: null })
            .where("id", "=", clipId)
            .execute();

        return NextResponse.json({ success: true, status: "active" });
    } catch (error) {
        console.error("Failed to unarchive clip:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
