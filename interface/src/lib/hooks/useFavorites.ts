/**
 * React Hooks for Favorites
 * 
 * Custom hooks that wrap TanStack Query for favorites functionality.
 * Includes optimistic updates and cache invalidation.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    favoriteKeys,
    favoriteStatusQuery,
    addFavoriteMutation,
    addMultipleFavoritesMutation,
    removeFavoriteMutation,
    removeMultipleFavoritesMutation,
    toggleFavoriteMutation,
} from "@/lib/queries/favorites";
import { clipKeys } from "@/lib/queries/clip";
import type { FullClip } from "@/lib/api/clip";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Check if a clip is favorited by the current user
 * 
 * @example
 * ```tsx
 * function HeartButton({ clipId }: { clipId: string }) {
 *   const { data: isFavorited, isLoading } = useFavoriteStatus(clipId);
 *   
 *   return (
 *     <button disabled={isLoading}>
 *       {isFavorited ? "❤️" : "🤍"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useFavoriteStatus(clipId: string) {
    return useQuery({
        ...favoriteStatusQuery(clipId),
        select: (data) => data.isFavorited,
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Add a single clip to favorites with optimistic updates
 */
export function useAddFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        ...addFavoriteMutation,
        onMutate: async (clipId: string) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: favoriteKeys.status(clipId) });

            // Snapshot previous value
            const previousStatus = queryClient.getQueryData(favoriteKeys.status(clipId));

            // Optimistically update to favorited
            queryClient.setQueryData(favoriteKeys.status(clipId), { isFavorited: true });

            // Update clip data in lists and detail views
            updateClipFavoriteStatus(queryClient, clipId, true);

            return { previousStatus };
        },
        onError: (err, clipId, context) => {
            // Rollback on error
            if (context?.previousStatus) {
                queryClient.setQueryData(favoriteKeys.status(clipId), context.previousStatus);
                updateClipFavoriteStatus(queryClient, clipId, false);
            }
        },
        onSettled: (data, error, clipId) => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: favoriteKeys.status(clipId) });
        },
    });
}

/**
 * Remove a single clip from favorites with optimistic updates
 */
export function useRemoveFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        ...removeFavoriteMutation,
        onMutate: async (clipId: string) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: favoriteKeys.status(clipId) });

            // Snapshot previous value
            const previousStatus = queryClient.getQueryData(favoriteKeys.status(clipId));

            // Optimistically update to not favorited
            queryClient.setQueryData(favoriteKeys.status(clipId), { isFavorited: false });

            // Update clip data in lists and detail views
            updateClipFavoriteStatus(queryClient, clipId, false);

            return { previousStatus };
        },
        onError: (err, clipId, context) => {
            // Rollback on error
            if (context?.previousStatus) {
                queryClient.setQueryData(favoriteKeys.status(clipId), context.previousStatus);
                updateClipFavoriteStatus(queryClient, clipId, true);
            }
        },
        onSettled: (data, error, clipId) => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: favoriteKeys.status(clipId) });
        },
    });
}

/**
 * Toggle favorite status for a single clip with optimistic updates
 * 
 * @example
 * ```tsx
 * function HeartButton({ clipId }: { clipId: string }) {
 *   const { data: isFavorited } = useFavoriteStatus(clipId);
 *   const toggleFavorite = useToggleFavorite();
 *   
 *   return (
 *     <button 
 *       onClick={() => toggleFavorite.mutate(clipId)}
 *       disabled={toggleFavorite.isPending}
 *     >
 *       {isFavorited ? "❤️" : "🤍"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        ...toggleFavoriteMutation,
        onMutate: async (clipId: string) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: favoriteKeys.status(clipId) });

            // Get current status
            const currentStatus = queryClient.getQueryData(favoriteKeys.status(clipId)) as 
                { isFavorited: boolean } | undefined;
            const currentFavorited = currentStatus?.isFavorited || false;
            const newFavorited = !currentFavorited;

            // Optimistically update
            queryClient.setQueryData(favoriteKeys.status(clipId), { isFavorited: newFavorited });

            // Update clip data in lists and detail views
            updateClipFavoriteStatus(queryClient, clipId, newFavorited);

            return { previousStatus: currentStatus };
        },
        onError: (err, clipId, context) => {
            // Rollback on error
            if (context?.previousStatus) {
                queryClient.setQueryData(favoriteKeys.status(clipId), context.previousStatus);
                const wasFavorited = context.previousStatus.isFavorited;
                updateClipFavoriteStatus(queryClient, clipId, wasFavorited);
            }
        },
        onSettled: (data, error, clipId) => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: favoriteKeys.status(clipId) });
        },
    });
}

/**
 * Add multiple clips to favorites with bulk operation
 */
export function useAddMultipleFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        ...addMultipleFavoritesMutation,
        onMutate: async (clipIds: string[]) => {
            // Cancel outgoing refetches for all clips
            await Promise.all(
                clipIds.map(clipId => 
                    queryClient.cancelQueries({ queryKey: favoriteKeys.status(clipId) })
                )
            );

            // Snapshot previous values
            const previousStatuses = clipIds.map(clipId => ({
                clipId,
                status: queryClient.getQueryData(favoriteKeys.status(clipId))
            }));

            // Optimistically update all to favorited
            clipIds.forEach(clipId => {
                queryClient.setQueryData(favoriteKeys.status(clipId), { isFavorited: true });
                updateClipFavoriteStatus(queryClient, clipId, true);
            });

            return { previousStatuses };
        },
        onError: (err, clipIds, context) => {
            // Rollback on error
            if (context?.previousStatuses) {
                context.previousStatuses.forEach(({ clipId, status }) => {
                    if (status) {
                        queryClient.setQueryData(favoriteKeys.status(clipId), status);
                        const wasFavorited = (status as any)?.isFavorited || false;
                        updateClipFavoriteStatus(queryClient, clipId, wasFavorited);
                    }
                });
            }
        },
        onSettled: (data, error, clipIds) => {
            // Refetch to ensure consistency
            clipIds.forEach(clipId => {
                queryClient.invalidateQueries({ queryKey: favoriteKeys.status(clipId) });
            });
        },
    });
}

/**
 * Remove multiple clips from favorites with bulk operation
 */
export function useRemoveMultipleFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        ...removeMultipleFavoritesMutation,
        onMutate: async (clipIds: string[]) => {
            // Cancel outgoing refetches for all clips
            await Promise.all(
                clipIds.map(clipId => 
                    queryClient.cancelQueries({ queryKey: favoriteKeys.status(clipId) })
                )
            );

            // Snapshot previous values
            const previousStatuses = clipIds.map(clipId => ({
                clipId,
                status: queryClient.getQueryData(favoriteKeys.status(clipId))
            }));

            // Optimistically update all to not favorited
            clipIds.forEach(clipId => {
                queryClient.setQueryData(favoriteKeys.status(clipId), { isFavorited: false });
                updateClipFavoriteStatus(queryClient, clipId, false);
            });

            return { previousStatuses };
        },
        onError: (err, clipIds, context) => {
            // Rollback on error
            if (context?.previousStatuses) {
                context.previousStatuses.forEach(({ clipId, status }) => {
                    if (status) {
                        queryClient.setQueryData(favoriteKeys.status(clipId), status);
                        const wasFavorited = (status as any)?.isFavorited || false;
                        updateClipFavoriteStatus(queryClient, clipId, wasFavorited);
                    }
                });
            }
        },
        onSettled: (data, error, clipIds) => {
            // Refetch to ensure consistency
            clipIds.forEach(clipId => {
                queryClient.invalidateQueries({ queryKey: favoriteKeys.status(clipId) });
            });
        },
    });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update the isFavorited status in all clip-related queries
 * This ensures consistency across clip lists and detail views
 */
function updateClipFavoriteStatus(
    queryClient: ReturnType<typeof useQueryClient>,
    clipId: string,
    isFavorited: boolean
) {
    // Update all clip list queries
    queryClient.setQueriesData(
        { queryKey: clipKeys.lists() },
        (oldData: any) => {
            if (!oldData?.pages) return oldData;
            
            return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                    ...page,
                    clips: page.clips?.map((clip: FullClip) =>
                        clip.clip.id === clipId
                            ? { ...clip, isFavorited }
                            : clip
                    ) || page.clips,
                })),
            };
        }
    );

    // Update clip detail queries
    queryClient.setQueriesData(
        { queryKey: clipKeys.all },
        (oldData: FullClip | undefined) => {
            if (!oldData || oldData.clip.id !== clipId) return oldData;
            return { ...oldData, isFavorited };
        }
    );
}
