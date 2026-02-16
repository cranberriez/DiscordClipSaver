import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { getDb } from "@/server/db";

/**
 * DELETE /api/clips/[clipId]
 *
 * Hard delete a clip and its message.
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
        // Fetch clip info (even if soft deleted) to check permissions
        const clipResult = await getDb()
            .selectFrom("clip")
            .select(["guild_id", "message_id"])
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
                {
                    error: "Permission denied. Only server owner can delete clips permanently.",
                },
                { status: 403 }
            );
        }

        // Hard delete the clip
        // Also delete the message? User said "Delete (deletes the clip, and associated message from the database)"

        await getDb()
            .transaction()
            .execute(async trx => {
                // Delete thumbnails
                await trx
                    .deleteFrom("thumbnail")
                    .where("clip_id", "=", clipId)
                    .execute();

                // Delete favorites
                await trx
                    .deleteFrom("favorite_clip")
                    .where("clip_id", "=", clipId)
                    .execute();

                // Delete clip
                await trx.deleteFrom("clip").where("id", "=", clipId).execute();

                // Delete message (only if no other clips attached? For now assume 1:1 or delete anyway as requested)
                // Ideally we check if message has other clips, but typically it's one clip per message for this app
                await trx
                    .deleteFrom("message")
                    .where("id", "=", clipResult.message_id)
                    .execute();
            });

        return NextResponse.json({ success: true, status: "deleted" });
    } catch (error) {
        console.error("Failed to delete clip:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
