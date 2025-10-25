import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import {
    getGuilds,
    getGuild,
    toggleScanning,
    getGuildsDiscord,
    getGuildStats,
    type GuildStatsOptions,
} from "../api/guild";
import type {
    EnrichedDiscordGuild,
    Guild,
    GuildResponse,
    GuildWithStats,
} from "../api/guild";
import { api } from "../api/client";

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
    listWithClipCount: () => [...guildKeys.all, "with-clip-count"] as const,
    stats: (
        guildIds: string[],
        options: { withClipCount?: boolean; withAuthorCount?: boolean } = {}
    ) =>
        [
            ...guildKeys.all,
            "stats",
            guildIds.sort(),
            {
                withClipCount: !!options.withClipCount,
                withAuthorCount: !!options.withAuthorCount,
            },
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

export const guildQuery = (
    guildId: string,
    options?: Omit<UseQueryOptions<Guild>, "queryKey" | "queryFn">
) =>
    queryOptions<Guild>({
        queryKey: guildKeys.detail(guildId),
        queryFn: () => getGuild(guildId),
        enabled: !!guildId,
        staleTime: 60_000,
        ...options,
    });

export const guildsWithClipCountQuery = () =>
    queryOptions<GuildWithStats[]>({
        queryKey: guildKeys.listWithClipCount(),
        queryFn: () => api.guilds.listWithClipCount(),
        staleTime: 60_000,
    });

/**
 * Query options for fetching guild stats
 *
 * @param guildIds - Array of guild IDs to fetch stats for
 * @param options - Options for which stats to include
 * @returns Query options for TanStack Query
 *
 * @example
 * ```typescript
 * const query = guildStatsQuery(['123', '456'], {
 *   withClipCount: true,
 *   withAuthorCount: true
 * });
 * ```
 */
export const guildStatsQuery = (
    guildIds: string[],
    options?: GuildStatsOptions
) =>
    queryOptions<GuildWithStats[]>({
        queryKey: guildKeys.stats(guildIds, options || {}),
        queryFn: () => getGuildStats(guildIds, options),
        enabled: guildIds.length > 0,
        staleTime: 60_000,
    });

export const toggleGuildScanning = async (guildId: string, enabled: boolean) =>
    toggleScanning(guildId, enabled);
