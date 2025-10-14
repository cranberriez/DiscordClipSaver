// app/api/discord/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserByDiscordId, setGuildOwnerIfUnclaimed, consumeInstallIntent } from "@/lib/db";
import { tryGetAuthInfo } from "@/lib/auth";

const ME_URL = "https://discord.com/api/v10/users/@me";

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const state = url.searchParams.get("state");

	// If the user denied/cancelled on Discord, an `error` param will be present.
	const oauthError = url.searchParams.get("error");
	if (oauthError) {
		// Best-effort cleanup of the pending intent and recovery of guildId for UX
		let guildId: string | null = null;
		if (state) {
			try {
				const intent = await consumeInstallIntent({ state });
				if (intent) {
					guildId = intent.guild_id;
				}
			} catch {
				// ignore cleanup failure; still redirect with error details
			}
		}
		const redirectUrl = new URL(`/install`, req.url);
		if (guildId) redirectUrl.searchParams.set("guild", guildId);
		redirectUrl.searchParams.set("status", "denied");
		redirectUrl.searchParams.set("error", oauthError);
		const errDesc = url.searchParams.get("error_description");
		if (errDesc) redirectUrl.searchParams.set("error_description", errDesc);
		return NextResponse.redirect(redirectUrl);
	}

	if (!state) {
		return NextResponse.json({ error: "Missing state" }, { status: 400 });
	}

	// 1) Verify install intent (state)
	const intent = await consumeInstallIntent({state});
	if (!intent || new Date(intent.expires_at) < new Date()) {
		return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
	}
	const { guild_id: guildId, user_id: intendedAppUserId } = intent;

	// 2) Exchange code for a USER access token
	const authInfo = await tryGetAuthInfo(req);
	if (!authInfo) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const tok = authInfo.accessToken;

	// 3) Identify the installer user
	const meRes = await fetch(ME_URL, { headers: { Authorization: `Bearer ${tok}` } });
	if (!meRes.ok) {
		return NextResponse.json({ error: "Failed to fetch /users/@me" }, { status: 400 });
	}
	const me = (await meRes.json()) as { id: string };

	// 4) Map Discord user -> your app user (you created this at login)
	const appUser = await getUserByDiscordId(me.id);
	if (!appUser || appUser.id !== intendedAppUserId) {
		// The user finishing the flow isn’t the one who initiated it; choose policy
		return NextResponse.json({ error: "User mismatch" }, { status: 403 });
	}

	// 5) Claim ownership if unclaimed
	if (!guildId) throw new Error("Guild ID is required");
	const claimed = await setGuildOwnerIfUnclaimed(guildId, appUser.id);
	if (!claimed) {
		// already claimed
		await consumeInstallIntent({state}); // still consume it
		return NextResponse.redirect(new URL(`/install?guild=${guildId}&status=already_claimed`, req.url));
	}

	// 6) Mark intent consumed
	await consumeInstallIntent({state});

	// (Optional) You may kick an async check that the bot has joined and update UI later
	return NextResponse.redirect(new URL(`/install?guild=${guildId}&status=ok`, req.url));
}
