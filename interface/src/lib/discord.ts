import "server-only";
import type { PartialGuild } from "@/lib/types";

const ADMINISTRATOR = BigInt(8); // 1 << 3
const MANAGE_GUILD = BigInt(32); // 1 << 5

export function canInviteBot(g: PartialGuild): boolean {
	if (g.owner) return true;
	const perms = BigInt((g.permissions as string | number | undefined) ?? 0);
	return (perms & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);
}

export function filterInvitableGuilds(guilds: PartialGuild[]): PartialGuild[] {
	return guilds.filter(canInviteBot);
}
