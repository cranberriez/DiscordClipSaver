export function areDiscordInvitesDisabled() {
	return process.env.DISCORD_INVITES_DISABLED?.trim() === "1";
}
