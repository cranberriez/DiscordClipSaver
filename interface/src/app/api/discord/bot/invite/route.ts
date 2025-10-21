import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAuth } from "@/server/middleware/auth";
import { createInstallIntent } from "@/server/db";
import { buildInviteUrl } from "@/server/discord/generateBotInvite";

/**
 * GET /api/discord/bot/invite
 *
 * Generate a Discord bot invite URL with state tracking.
 * Creates an install intent that expires in 10 minutes.
 *
 * Query params:
 * - guildId: The Discord guild ID to invite the bot to
 */
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guildId");
    if (!guildId) {
        return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
    }

    // Verify authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    // Generate a cryptographically strong state token
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await createInstallIntent({
        state,
        user_id: auth.discordUserId,
        guild: guildId,
        expires_at: expiresAt,
    });

    const inviteUrl = buildInviteUrl(guildId, state);
    return NextResponse.redirect(inviteUrl);
}
