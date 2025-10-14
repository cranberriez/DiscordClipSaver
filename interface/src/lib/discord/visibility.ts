import "server-only";
import type { DiscordGuild } from "@/lib/discord/types";

const ADMINISTRATOR = BigInt(8); // 1 << 3
const MANAGE_GUILD = BigInt(32); // 1 << 5

export function canInviteBot(g: DiscordGuild): boolean {
    if (!g) return false;
    if (g.owner) return true;
    if (!g.permissions) return false;
    const perms = BigInt((g.permissions as string | number | undefined) ?? 0);
    return (perms & (ADMINISTRATOR | MANAGE_GUILD)) !== BigInt(0);
}

export function filterInvitableGuilds(guilds: DiscordGuild[]): DiscordGuild[] {
    return guilds.filter(g => canInviteBot(g));
}
