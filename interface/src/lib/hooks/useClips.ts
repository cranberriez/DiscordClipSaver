"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
    clipKeys,
    clipsQuery,
    clipsInfiniteQuery,
    clipQuery,
} from "@/lib/queries/clip";
import type { FullClip, ClipListParams } from "@/lib/api/clip";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch clips with standard pagination.
 * Supports filtering by multiple channels and custom sort order.
 *
 * For most use cases, prefer `useChannelClipsInfinite` for better UX.
 *
 * @example
 * ```tsx
 * function ClipsList({ guildId, channelIds }: Props) {
 *   const { data, isLoading } = useChannelClips({
 *     guildId,
 *     channelIds: ['123', '456'],
 *     limit: 50,
 *     offset: 0,
 *     sortOrder: 'desc',
 *     sortType: 'date'
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {data?.clips.map(clip => (
 *         <ClipCard key={clip.clip.id} clip={clip} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChannelClips(params: ClipListParams) {
    return useQuery(clipsQuery(params));
}

/**
 * @deprecated Use useChannelClips instead
 */
export function useClips(params: {
    guildId: string;
    channelId?: string;
    limit?: number;
    offset?: number;
}) {
    return useChannelClips({
        ...params,
        channelIds: params.channelId ? [params.channelId] : undefined,
    });
}

/**
 * Fetch clips with infinite scroll pagination (recommended).
 * Supports filtering by multiple channels and custom sort order.
 *
 * This hook provides automatic "Load More" functionality with proper caching.
 *
 * @example
 * ```tsx
 * function ClipsInfiniteList({ guildId, channelIds }: Props) {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *     isLoading,
 *   } = useChannelClipsInfinite({
 *     guildId,
 *     channelIds: ['123', '456'],
 *     limit: 50,
 *     sortOrder: 'desc'
 *   });
 *
 *   const allClips = data?.pages.flatMap(page => page.clips) ?? [];
 *
 *   return (
 *     <div>
 *       {allClips.map(clip => (
 *         <ClipCard key={clip.clip.id} clip={clip} />
 *       ))}
 *
 *       {hasNextPage && (
 *         <button
 *           onClick={() => fetchNextPage()}
 *           disabled={isFetchingNextPage}
 *         >
 *           {isFetchingNextPage ? 'Loading...' : 'Load More'}
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChannelClipsInfinite(params: ClipListParams) {
    return useInfiniteQuery(clipsInfiniteQuery(params));
}

/**
 * @deprecated Use useChannelClipsInfinite instead
 */
export function useClipsInfinite(params: {
    guildId: string;
    channelId?: string;
    limit?: number;
}) {
    return useChannelClipsInfinite({
        ...params,
        channelIds: params.channelId ? [params.channelId] : undefined,
    });
}

/**
 * Fetch a single clip by ID.
 *
 * CDN URLs are automatically refreshed on the server if expired.
 *
 * @example
 * ```tsx
 * function ClipDetail({ guildId, clipId }: Props) {
 *   const { data: clip, isLoading } = useClip(guildId, clipId);
 *
 *   if (isLoading) return <div>Loading clip...</div>;
 *   if (!clip) return <div>Clip not found</div>;
 *
 *   return (
 *     <div>
 *       <video src={clip.clip.cdn_url} controls />
 *       <p>{clip.message.content}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useClip(guildId: string, clipId: string) {
    return useQuery(clipQuery(guildId, clipId));
}

/**
 * Export clipKeys for manual cache invalidation.
 * Useful after bulk operations (scans, purges, etc.)
 *
 * @example
 * ```tsx
 * function GuildActions({ guildId }: Props) {
 *   const queryClient = useQueryClient();
 *
 *   const handleScanComplete = () => {
 *     // Invalidate all clips to refetch with new data
 *     queryClient.invalidateQueries({
 *       queryKey: clipKeys.byGuild({ guildId })
 *     });
 *   };
 *
 *   return <button onClick={handleScanComplete}>Refresh Clips</button>;
 * }
 * ```
 */
export { clipKeys };
