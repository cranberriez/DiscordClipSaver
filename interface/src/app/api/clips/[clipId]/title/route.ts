import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { getDb } from "@/server/db";

/**
 * PATCH /api/clips/[clipId]/title
 *
 * Update clip title.
 * Permission: Clip Owner OR Guild Owner OR System Admin
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
        let { title } = body;

        // Validation
        if (typeof title !== "string") {
            return NextResponse.json(
                { error: "Title must be a string" },
                { status: 400 }
            );
        }

        title = title.trim();

        if (title.length < 2 || title.length > 254) {
            return NextResponse.json(
                { error: "Title must be between 2 and 254 characters" },
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

        // Check for system admin if not owner
        let isSystemAdmin = false;
        if (!isClipOwner && !isGuildOwner) {
            const user = await getDb()
                .selectFrom("user")
                .select("roles")
                .where("id", "=", auth.discordUserId)
                .executeTakeFirst();
            
            if (user && user.roles === "admin") {
                isSystemAdmin = true;
            }
        }

        if (!isClipOwner && !isGuildOwner && !isSystemAdmin) {
            return NextResponse.json(
                { error: "Permission denied" },
                { status: 403 }
            );
        }

        // Update title
        await getDb()
            .updateTable("clip")
            .set({ title })
            .where("id", "=", clipId)
            .execute();

        return NextResponse.json({ success: true, title });
    } catch (error) {
        console.error("Failed to update clip title:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
