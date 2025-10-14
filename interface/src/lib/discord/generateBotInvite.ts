import "server-only";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_BOT_SCOPE = process.env.DISCORD_BOT_SCOPE!;
const DISCORD_REDIRECT_URI = "/api/discord/bot/claim";
const PERMISSIONS = process.env.DISCORD_BOT_PERMISSIONS!;
const BASE_URL = process.env.NEXTAUTH_URL!;

export function buildInviteUrl(guildId: string, state?: string) {
    const base = "https://discord.com/oauth2/authorize";
    // Construct full redirect URI from base URL and path
    const redirectUri = DISCORD_REDIRECT_URI.startsWith("http")
        ? DISCORD_REDIRECT_URI
        : `${BASE_URL}${DISCORD_REDIRECT_URI}`;

    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        scope: DISCORD_BOT_SCOPE,
        permissions: PERMISSIONS,
        guild_id: guildId,
        disable_guild_select: "true",
        redirect_uri: redirectUri,
        response_type: "code",
    });

    if (state) {
        params.set("state", state);
    }

    return `${base}?${params.toString()}`;
}
