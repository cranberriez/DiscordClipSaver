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
 * - Filtered clips: ['clips', 'list', { guildId, channelIds?, authorIds?, sort }]
 *
 * This structure allows TanStack Query to:
 * 1. Cache individual clips and reuse them in lists
 * 2. Invalidate all clips for a guild: queryClient.invalidateQueries({ queryKey: clipKeys.byGuild(guildId) })
 * 3. Different filter combinations are cached separately for proper pagination
 */
export const clipKeys = {
    all: ["clips"] as const,
    lists: () => [...clipKeys.all, "list"] as const,

    // List by guild with optional filters
    byGuild: (
        guildId: string,
        sort?: "asc" | "desc",
        authorIds?: string[]
    ) => [...clipKeys.lists(), { guildId, sort, authorIds }] as const,

    // List by specific channels with optional author filter
    byChannels: (
        guildId: string,
        channelIds: string[],
        sort?: "asc" | "desc",
        authorIds?: string[]
    ) => [...clipKeys.lists(), { guildId, channelIds, sort, authorIds }] as const,

    // Single clip detail
    detail: (clipId: string) => [...clipKeys.all, clipId] as const,
};

// ============================================================================
// Query Options
// ============================================================================

/**
 * Query options for fetching clips with pagination.
 * Supports filtering by channels, authors, and sorting.
 */
export const clipsQuery = (params: {
    guildId: string;
    channelIds?: string[];
    authorIds?: string[];
    limit?: number;
    offset?: number;
    sort?: "asc" | "desc";
}) =>
    queryOptions<ClipListResponse>({
        queryKey:
            params.channelIds && params.channelIds.length > 0
                ? clipKeys.byChannels(
                      params.guildId,
                      params.channelIds,
                      params.sort,
                      params.authorIds
                  )
                : clipKeys.byGuild(params.guildId, params.sort, params.authorIds),
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
 * } = useInfiniteQuery(clipsInfiniteQuery({ guildId, channelIds: ['123'], authorIds: ['456'], limit: 50 }));
 *
 * const allClips = data?.pages.flatMap(page => page.clips) ?? [];
 * ```
 */
export const clipsInfiniteQuery = (params: {
    guildId: string;
    channelIds?: string[];
    authorIds?: string[];
    limit?: number;
    sort?: "asc" | "desc";
}) =>
    infiniteQueryOptions<ClipListResponse>({
        queryKey:
            params.channelIds && params.channelIds.length > 0
                ? clipKeys.byChannels(
                      params.guildId,
                      params.channelIds,
                      params.sort,
                      params.authorIds
                  )
                : clipKeys.byGuild(params.guildId, params.sort, params.authorIds),
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
