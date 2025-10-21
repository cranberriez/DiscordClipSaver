"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
    clipKeys,
    clipsQuery,
    clipsInfiniteQuery,
    clipQuery,
} from "@/lib/queries/clip";
import type { FullClip } from "@/lib/api/clip";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch clips with standard pagination.
 *
 * For most use cases, prefer `useClipsInfinite` for better UX.
 *
 * @example
 * ```tsx
 * function ClipsList({ guildId, channelId }: Props) {
 *   const { data, isLoading } = useClips({ guildId, channelId, limit: 50, offset: 0 });
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
export function useClips(params: {
    guildId: string;
    channelId?: string;
    limit?: number;
    offset?: number;
}) {
    return useQuery(clipsQuery(params));
}

/**
 * Fetch clips with infinite scroll pagination (recommended).
 *
 * This hook provides automatic "Load More" functionality with proper caching.
 *
 * @example
 * ```tsx
 * function ClipsInfiniteList({ guildId, channelId }: Props) {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *     isLoading,
 *   } = useClipsInfinite({ guildId, channelId, limit: 50 });
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
export function useClipsInfinite(params: {
    guildId: string;
    channelId?: string;
    limit?: number;
}) {
    return useInfiniteQuery(clipsInfiniteQuery(params));
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
 *       queryKey: clipKeys.byGuild(guildId)
 *     });
 *   };
 *
 *   return <button onClick={handleScanComplete}>Refresh Clips</button>;
 * }
 * ```
 */
export { clipKeys };
