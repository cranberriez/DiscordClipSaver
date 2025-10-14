import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { tryGetAuthInfo } from "@/lib/auth";
import { createInstallIntent } from "@/lib/db";
import { buildInviteUrl } from "@/lib/discord/generateBotInvite";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guildId");
    if (!guildId) {
        return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
    }

    const auth = await tryGetAuthInfo(req);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a cryptographically strong state token
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await createInstallIntent({
        state,
        user_id: auth.discordUserId,
        guild_id: guildId,
        expires_at: expiresAt,
    });

    const inviteUrl = buildInviteUrl(guildId, state);
    return NextResponse.redirect(inviteUrl);
}
