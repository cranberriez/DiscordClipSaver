import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { getDb } from "@/server/db";
import { PermissionService } from "@/server/services/permission-service";

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
        // Check Permissions
        const permResult = await PermissionService.checkClipPermission(
            clipId,
            auth.discordUserId,
            ["guild_owner"]
        );

        if (!permResult.success) {
            return NextResponse.json(
                {
                    error:
                        permResult.error === "Permission denied"
                            ? "Permission denied. Only server owner can archive clips."
                            : permResult.error,
                },
                { status: permResult.status || 403 }
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
        // Check Permissions (include deleted clips since we are unarchiving)
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
                            ? "Permission denied. Only server owner can unarchive clips."
                            : permResult.error,
                },
                { status: permResult.status || 403 }
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
