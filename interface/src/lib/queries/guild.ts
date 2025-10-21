import { queryOptions } from "@tanstack/react-query";
import { getGuildSettings, type GuildSettingsResponse } from "../api/settings";
import {
    getGuilds,
    getGuild,
    toggleScanning,
    getGuildsDiscord,
} from "../api/guild";
import type { EnrichedDiscordGuild, Guild, GuildResponse } from "../api/guild";

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query keys for guilds and related data.
 * This ensures consistent cache keys across the app.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */
export const guildKeys = {
    all: ["guilds"] as const,
    list: (params: { includePerms?: boolean } = {}) =>
        [
            ...guildKeys.all,
            "list",
            { includePerms: !!params.includePerms },
        ] as const,
    discordList: (params: { includeDB?: boolean } = {}) =>
        [
            ...guildKeys.all,
            "discord",
            "list",
            { includeDB: !!params.includeDB },
        ] as const,
    detail: (guildId: string) => [...guildKeys.all, guildId] as const,
    settings: (guildId: string) =>
        [...guildKeys.detail(guildId), "settings"] as const,
};

// ============================================================================
// Queries
// ============================================================================

export const guildsQuery = (includePerms?: boolean) =>
    queryOptions<GuildResponse[]>({
        queryKey: guildKeys.list({ includePerms: !!includePerms }),
        queryFn: () => getGuilds(includePerms),
        staleTime: 60_000,
    });

export const guildsDiscordQuery = (includeDB?: boolean) =>
    queryOptions<EnrichedDiscordGuild[]>({
        queryKey: guildKeys.discordList({ includeDB: !!includeDB }),
        queryFn: () => getGuildsDiscord(includeDB),
        staleTime: 60_000,
    });

export const guildQuery = (guildId: string) =>
    queryOptions<Guild>({
        queryKey: guildKeys.detail(guildId),
        queryFn: () => getGuild(guildId),
        enabled: !!guildId,
        staleTime: 60_000,
    });

export const guildSettingsQuery = (guildId: string) =>
    queryOptions<GuildSettingsResponse>({
        queryKey: guildKeys.settings(guildId),
        queryFn: () => getGuildSettings(guildId),
        enabled: !!guildId,
        staleTime: 60_000,
    });

export const toggleGuildScanning = async (guildId: string, enabled: boolean) =>
    toggleScanning(guildId, enabled);
