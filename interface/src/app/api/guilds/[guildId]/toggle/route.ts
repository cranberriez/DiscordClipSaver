import { NextRequest, NextResponse } from "next/server";
import { tryGetAuthInfo } from "@/lib/auth";
import { getSingleGuildById, updateGuildMessageScanEnabled } from "@/lib/db";
import { z } from "zod";

const ToggleSchema = z.object({
    enabled: z.boolean(),
});

/**
 * POST /api/guilds/[guildId]/toggle
 * 
 * Toggle message scanning for the entire guild.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication
    const authInfo = await tryGetAuthInfo(req);
    if (!authInfo) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify guild exists and user has access
    const guild = await getSingleGuildById(guildId);
    if (!guild) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Verify user owns this guild
    if (guild.owner_id !== authInfo.discordUserId) {
        return NextResponse.json(
            { error: "Forbidden: You do not own this guild" },
            { status: 403 }
        );
    }

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

    const validation = ToggleSchema.safeParse(body);
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

    // Update guild message_scan_enabled
    try {
        await updateGuildMessageScanEnabled(guildId, enabled);

        return NextResponse.json({
            success: true,
            enabled,
        });
    } catch (error) {
        console.error("Failed to toggle guild:", error);
        return NextResponse.json(
            { error: "Failed to update guild" },
            { status: 500 }
        );
    }
}
