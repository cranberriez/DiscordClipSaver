/**
 * Discord Permission Utilities
 *
 * Pure utility functions for checking Discord permissions.
 * Safe to use in both client and server components.
 */
import type { DiscordGuild } from "@/server/discord/types";

const ADMINISTRATOR = BigInt(8); // 1 << 3
const MANAGE_GUILD = BigInt(32); // 1 << 5

/**
 * Check if a user can invite the bot to a guild.
 * Returns true if user is owner or has ADMINISTRATOR or MANAGE_GUILD permissions.
 */
export function canInviteBot(g: DiscordGuild): boolean {
	if (!g) return false;
	if (g.owner) return true;
	if (!g.permissions) return false;
	const perms = BigInt((g.permissions as string | number | undefined) ?? 0);
	return (perms & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);
}
export function canInviteBotPerms(perms: bigint): boolean {
	return (perms & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);
}

/**
 * Filter guilds to only those where the user can invite the bot.
 */
export function filterInvitableGuilds(guilds: DiscordGuild[]): DiscordGuild[] {
	return guilds.filter((g) => canInviteBot(g));
}
