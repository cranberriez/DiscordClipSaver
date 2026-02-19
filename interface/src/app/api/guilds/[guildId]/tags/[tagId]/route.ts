import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess, canManageGuild } from "@/server/middleware/auth";
import * as db from "@/server/db/queries/tags";

/**
 * DELETE /api/guilds/[guildId]/tags/[tagId]
 *
 * Delete (or soft delete) a tag.
 * Permission: Guild Manager or Owner
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string; tagId: string }> }
) {
    const { guildId, tagId } = await params;
    const auth = await requireGuildAccess(req, guildId);

    if (auth instanceof NextResponse) return auth;

    // Check permissions
    if (!auth.isOwner && !canManageGuild(auth.discordGuild)) {
        return NextResponse.json(
            {
                error: "You do not have permission to manage tags in this guild",
            },
            { status: 403 }
        );
    }

    try {
        // Verify the tag belongs to the guild
        const tag = await db.getServerTagById(tagId);
        if (!tag) {
             return NextResponse.json(
                { error: "Tag not found" },
                { status: 404 }
            );
        }

        if (tag.guild_id !== guildId) {
             return NextResponse.json(
                { error: "Tag does not belong to this guild" },
                { status: 403 }
            );
        }

        const success = await db.deleteServerTag(tagId);

        if (!success) {
            return NextResponse.json(
                { error: "Failed to delete tag" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete tag:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
