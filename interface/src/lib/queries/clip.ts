import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { FullClip, ClipListResponse } from "@/lib/api/clip";

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query keys for clips.
 *
 * Key Strategy:
 * - Individual clips: ['clips', clipId] - Allows sharing across different lists
 * - Channel clips: ['clips', 'list', { guildId, channelId }]
 * - Guild clips: ['clips', 'list', { guildId }] - All channels
 *
 * This structure allows TanStack Query to:
 * 1. Cache individual clips and reuse them in lists
 * 2. Invalidate all clips for a guild: queryClient.invalidateQueries({ queryKey: clipKeys.byGuild(guildId) })
 * 3. Invalidate clips for a channel: queryClient.invalidateQueries({ queryKey: clipKeys.byChannel(guildId, channelId) })
 */
export const clipKeys = {
    all: ["clips"] as const,
    lists: () => [...clipKeys.all, "list"] as const,

    // List by guild (all channels)
    byGuild: (guildId: string) => [...clipKeys.lists(), { guildId }] as const,

    // List by channel
    byChannel: (guildId: string, channelId: string) =>
        [...clipKeys.lists(), { guildId, channelId }] as const,

    // Single clip detail
    detail: (clipId: string) => [...clipKeys.all, clipId] as const,
};

// ============================================================================
// Query Options
// ============================================================================

/**
 * Query options for fetching clips with pagination.
 * Supports both per-channel and guild-wide queries.
 */
export const clipsQuery = (params: {
    guildId: string;
    channelId?: string;
    limit?: number;
    offset?: number;
}) =>
    queryOptions<ClipListResponse>({
        queryKey: params.channelId
            ? clipKeys.byChannel(params.guildId, params.channelId)
            : clipKeys.byGuild(params.guildId),
        queryFn: () => api.clips.list(params),
        enabled: !!params.guildId,
        staleTime: 60_000, // 1 minute
    });

/**
 * Infinite query options for clips with "Load More" pagination.
 * This is the recommended approach for clips viewing.
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * } = useInfiniteQuery(clipsInfiniteQuery({ guildId, channelId, limit: 50 }));
 *
 * const allClips = data?.pages.flatMap(page => page.clips) ?? [];
 * ```
 */
export const clipsInfiniteQuery = (params: {
    guildId: string;
    channelId?: string;
    limit?: number;
}) =>
    infiniteQueryOptions<ClipListResponse>({
        queryKey: params.channelId
            ? clipKeys.byChannel(params.guildId, params.channelId)
            : clipKeys.byGuild(params.guildId),
        queryFn: ({ pageParam }) =>
            api.clips.list({
                ...params,
                offset: pageParam as number,
            }),
        initialPageParam: 0,
        getNextPageParam: lastPage => {
            if (!lastPage.pagination.hasMore) return undefined;
            return lastPage.pagination.offset + lastPage.pagination.limit;
        },
        enabled: !!params.guildId,
        staleTime: 60_000, // 1 minute
    });

/**
 * Query options for a single clip by ID.
 */
export const clipQuery = (guildId: string, clipId: string) =>
    queryOptions<FullClip>({
        queryKey: clipKeys.detail(clipId),
        queryFn: () => api.clips.get(guildId, clipId),
        enabled: !!guildId && !!clipId,
        staleTime: 5 * 60_000, // 5 minutes - clips don't change often
    });

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if a clip's CDN URL has expired.
 * Note: The server automatically refreshes expired URLs when fetching clips.
 */
export function isClipExpired(clip: FullClip): boolean {
    return new Date(clip.clip.expires_at) < new Date();
}
