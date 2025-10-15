import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/lib/middleware/auth";
import { bulkUpdateChannelsEnabled } from "@/lib/db";
import { z } from "zod";

const BulkUpdateSchema = z.object({
    enabled: z.boolean(),
});

/**
 * POST /api/guilds/[guildId]/channels/bulk
 * 
 * Bulk enable/disable all channels for a guild.
 * Requires guild ownership.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and ownership
    const auth = await requireGuildAccess(req, guildId, true);
    if (auth instanceof NextResponse) return auth;

    // Parse and validate request body
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON in request body" },
            { status: 400 }
        );
    }

    const validation = BulkUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            {
                error: "Validation failed",
                details: validation.error.issues,
            },
            { status: 400 }
        );
    }

    const { enabled } = validation.data;

    // Perform bulk update
    try {
        const updatedCount = await bulkUpdateChannelsEnabled(guildId, enabled);

        return NextResponse.json({
            success: true,
            updated_count: updatedCount,
            enabled,
        });
    } catch (error) {
        console.error("Failed to bulk update channels:", error);
        return NextResponse.json(
            { error: "Failed to update channels" },
            { status: 500 }
        );
    }
}
