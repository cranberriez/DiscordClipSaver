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
 * If no guildId is provided, Discord will prompt the user to select a guild.
 */
export async function GET(req: NextRequest) {
    if (process.env.DISCORD_INVITES_DISABLED === "1") {
        return NextResponse.json(
            { error: "Bot invites are temporarily disabled" },
            { status: 403 }
        );
    }

    const url = new URL(req.url);
    const guildId = url.searchParams.get("guildId") || undefined;

    // Verify authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const ownerDiscordId = process.env.OWNER_DISCORD_ID;
    if (ownerDiscordId && auth.discordUserId !== ownerDiscordId) {
        return NextResponse.json(
            { error: "Bot invites are restricted" },
            { status: 403 }
        );
    }

    // Generate a cryptographically strong state token
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await createInstallIntent({
        state,
        user_id: auth.discordUserId,
        guild: guildId ?? null,
        expires_at: expiresAt,
    });

    const inviteUrl = buildInviteUrl(guildId, state);
    return NextResponse.redirect(inviteUrl);
}
