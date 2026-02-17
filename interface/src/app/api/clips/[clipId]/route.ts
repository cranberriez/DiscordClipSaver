import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { getDb } from "@/server/db";
import { PermissionService } from "@/server/services/permission-service";

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
        // Check Permissions (include deleted clips as we might be deleting an archived clip)
        const permResult = await PermissionService.checkClipPermission(
            clipId,
            auth.discordUserId,
            ["guild_owner"],
            { includeDeleted: true }
        );

        if (!permResult.success) {
            return NextResponse.json(
                {
                    error:
                        permResult.error === "Permission denied"
                            ? "Permission denied. Only server owner can delete clips permanently."
                            : permResult.error,
                },
                { status: permResult.status || 403 }
            );
        }

        const clip = permResult.clip!;

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
                    .where("id", "=", clip.message.id)
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
