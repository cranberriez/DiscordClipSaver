import { NextRequest, NextResponse } from "next/server";
import {
	getUserByDiscordId,
	setGuildOwnerIfUnclaimed,
	consumeInstallIntent,
} from "@/server/db";
import { requireAuth } from "@/server/middleware/auth";
import { getCurrentUser } from "@/server/discord/discordClient";

/**
 * GET /api/discord/bot/claim
 *
 * OAuth callback handler for bot installation.
 * Verifies the install intent and claims guild ownership.
 *
 * Query params:
 * - state: Install intent state token
 * - error: OAuth error (if user denied)
 * - error_description: OAuth error description
 */
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
					guildId = intent.guild;
				}
			} catch {
				// ignore cleanup failure; still redirect with error details
			}
		}
		const baseUrl = process.env.NEXTAUTH_URL || req.url;
		const redirectUrl = new URL("/install", baseUrl);
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
	const intent = await consumeInstallIntent({ state });
	if (!intent || new Date(intent.expires_at) < new Date()) {
		return NextResponse.json(
			{ error: "Invalid or expired state" },
			{ status: 400 }
		);
	}
	let guild: string | null = intent.guild;
	const intendedAppUserId = intent.user_id;
	// If guild wasn't preselected during invite, Discord includes it in the callback as `guild_id`
	if (!guild) {
		const cbGuild = url.searchParams.get("guild_id");
		if (cbGuild) {
			guild = cbGuild;
		}
	}

	// 2) Verify authentication and get access token
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	const tok = auth.accessToken;
	if (!tok) {
		return NextResponse.json(
			{ error: "Missing access token" },
			{ status: 401 }
		);
	}

	// 3) Identify the installer user (already have Discord ID from auth)
	// Verify with Discord API to ensure token is valid
	let me: { id: string };
	try {
		me = await getCurrentUser(tok);
	} catch (err) {
		console.error("Failed to verify Discord user:", err);
		return NextResponse.json(
			{ error: "Failed to verify Discord user" },
			{ status: 400 }
		);
	}

	// Verify the Discord ID matches our session
	if (me.id !== auth.discordUserId) {
		return NextResponse.json(
			{ error: "Discord user mismatch" },
			{ status: 403 }
		);
	}

	// 4) Map Discord user -> your app user (you created this at login)
	const appUser = await getUserByDiscordId(auth.discordUserId);
	if (!appUser || appUser.id !== intendedAppUserId) {
		// The user finishing the flow isn’t the one who initiated it; choose policy
		return NextResponse.json({ error: "User mismatch" }, { status: 403 });
	}

	// 5) Claim ownership if unclaimed
	if (!guild) throw new Error("Guild ID is required");
	const claimed = await setGuildOwnerIfUnclaimed(guild, appUser.id);
	if (!claimed) {
		// already claimed
		await consumeInstallIntent({ state }); // still consume it
		const baseUrl = process.env.NEXTAUTH_URL || req.url;
		return NextResponse.redirect(
			new URL(`/install?guild=${guild}&status=already_claimed`, baseUrl)
		);
	}

	// 6) Mark intent consumed
	await consumeInstallIntent({ state });

	// (Optional) You may kick an async check that the bot has joined and update UI later
	const baseUrl = process.env.NEXTAUTH_URL || req.url;
	return NextResponse.redirect(
		new URL(`/install?guild=${guild}&status=ok`, baseUrl)
	);
}
