import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { AuthorStatsResponse } from "@/lib/api/author";

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query keys for authors.
 *
 * Key Strategy:
 * - Author stats by guild: ['authors', 'stats', guildId]
 *
 * This structure allows TanStack Query to:
 * 1. Cache author stats per guild
 * 2. Invalidate all author data: queryClient.invalidateQueries({ queryKey: authorKeys.all })
 * 3. Invalidate specific guild: queryClient.invalidateQueries({ queryKey: authorKeys.statsByGuild(guildId) })
 */
export const authorKeys = {
    all: ["authors"] as const,
    stats: () => [...authorKeys.all, "stats"] as const,
    statsByGuild: (guildId: string) =>
        [...authorKeys.stats(), guildId] as const,
};

// ============================================================================
// Query Options
// ============================================================================

/**
 * Query options for fetching author statistics for a guild.
 * Returns all authors with clip counts and per-channel breakdowns.
 */
export const authorStatsQuery = (guildId: string) =>
    queryOptions<AuthorStatsResponse>({
        queryKey: authorKeys.statsByGuild(guildId),
        queryFn: () => api.authors.stats(guildId),
        enabled: !!guildId,
        staleTime: 120_000, // 2 minutes - authors don't change frequently
    });
