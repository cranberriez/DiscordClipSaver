const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_BOT_SCOPE = process.env.DISCORD_BOT_SCOPE!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;
const PERMISSIONS = process.env.DISCORD_BOT_PERMISSIONS!;

export function buildInviteUrl(guildId: string, state?: string) {
	const base = "https://discord.com/oauth2/authorize";
	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		scope: DISCORD_BOT_SCOPE,
		permissions: PERMISSIONS,
		guild_id: guildId,
		disable_guild_select: "true",
		redirect_uri: DISCORD_REDIRECT_URI,
		response_type: "code",
		// The server should provide a persisted state token (install intent)
		state: state ?? "",
	});
	return `${base}?${params.toString()}`;
}

