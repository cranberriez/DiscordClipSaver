import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { updateChannelEnabled } from "@/server/db";
import { z } from "zod";

const ToggleChannelSchema = z.object({
    enabled: z.boolean(),
});

/**
 * POST /api/guilds/[guildId]/channels/[channelId]/toggle
 *
 * Toggle message_scan_enabled for a single channel.
 * Requires guild ownership.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string; channelId: string }> }
) {
    const { guildId, channelId } = await params;

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

    const validation = ToggleChannelSchema.safeParse(body);
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

    // Update the channel
    try {
        const updated = await updateChannelEnabled(guildId, channelId, enabled);

        if (!updated) {
            return NextResponse.json(
                { error: "Channel not found or not updated" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            channelId,
            enabled,
        });
    } catch (error) {
        console.error("Failed to toggle channel:", error);
        return NextResponse.json(
            { error: "Failed to update channel" },
            { status: 500 }
        );
    }
}
