import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
    clipKeys,
    patchClipAcrossLists,
    patchClipDetail,
} from "@/lib/queries/clip";
import type { Tag, FullClip } from "@/lib/api/clip";

/**
 * Hook to add tags to a clip with optimistic updates.
 */
export function useAddClipTags() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            clipId,
            tags,
        }: {
            clipId: string;
            tags: Tag[];
        }) => {
            const tagIds = tags.map(t => t.id);
            return api.tags.add(clipId, tagIds);
        },
        onMutate: async ({ clipId, tags: newTags }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: clipKeys.detail(clipId),
            });
            await queryClient.cancelQueries({
                queryKey: clipKeys.lists(),
            });

            // Helper to get current tags from cache
            const getCurrentTags = (): Tag[] => {
                const clip = queryClient.getQueryData<FullClip>(
                    clipKeys.detail(clipId)
                );
                if (clip) return clip.tags;

                // Fallback: try to find in list
                const lists = queryClient.getQueriesData<any>({
                    queryKey: clipKeys.lists(),
                });
                for (const [, data] of lists) {
                    if (!data?.pages) continue;
                    for (const page of data.pages) {
                        const c = page.clips?.find(
                            (c: FullClip) => c.clip.id === clipId
                        );
                        if (c) return c.tags;
                    }
                }
                return [];
            };

            const currentTags = getCurrentTags();
            
            // Create a map for deduplication
            const tagMap = new Map<string, Tag>();
            currentTags.forEach(t => tagMap.set(t.id, t));
            newTags.forEach(t => tagMap.set(t.id, t));
            
            const updatedTags = Array.from(tagMap.values());

            // Optimistically update
            patchClipDetail(queryClient, clipId, { tags: updatedTags });
            patchClipAcrossLists(queryClient, clipId, { tags: updatedTags });

            return { previousTags: currentTags };
        },
        onError: (err, { clipId }, context) => {
            // Rollback
            if (context?.previousTags) {
                patchClipDetail(queryClient, clipId, {
                    tags: context.previousTags,
                });
                patchClipAcrossLists(queryClient, clipId, {
                    tags: context.previousTags,
                });
            }
        },
        onSettled: (data, error, { clipId }) => {
            // Invalidate to ensure consistency
            queryClient.invalidateQueries({
                queryKey: clipKeys.detail(clipId),
            });
            queryClient.invalidateQueries({
                queryKey: clipKeys.lists(),
            });
        },
    });
}

/**
 * Hook to remove tags from a clip with optimistic updates.
 */
export function useRemoveClipTags() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            clipId,
            tags,
        }: {
            clipId: string;
            tags: Tag[];
        }) => {
            const tagIds = tags.map(t => t.id);
            return api.tags.remove(clipId, tagIds);
        },
        onMutate: async ({ clipId, tags: tagsToRemove }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: clipKeys.detail(clipId),
            });
            await queryClient.cancelQueries({
                queryKey: clipKeys.lists(),
            });

            // Helper to get current tags from cache
            const getCurrentTags = (): Tag[] => {
                const clip = queryClient.getQueryData<FullClip>(
                    clipKeys.detail(clipId)
                );
                if (clip) return clip.tags;

                // Fallback: try to find in list
                const lists = queryClient.getQueriesData<any>({
                    queryKey: clipKeys.lists(),
                });
                for (const [, data] of lists) {
                    if (!data?.pages) continue;
                    for (const page of data.pages) {
                        const c = page.clips?.find(
                            (c: FullClip) => c.clip.id === clipId
                        );
                        if (c) return c.tags;
                    }
                }
                return [];
            };

            const currentTags = getCurrentTags();
            const removeIds = new Set(tagsToRemove.map(t => t.id));
            const updatedTags = currentTags.filter(t => !removeIds.has(t.id));

            // Optimistically update
            patchClipDetail(queryClient, clipId, { tags: updatedTags });
            patchClipAcrossLists(queryClient, clipId, { tags: updatedTags });

            return { previousTags: currentTags };
        },
        onError: (err, { clipId }, context) => {
            // Rollback
            if (context?.previousTags) {
                patchClipDetail(queryClient, clipId, {
                    tags: context.previousTags,
                });
                patchClipAcrossLists(queryClient, clipId, {
                    tags: context.previousTags,
                });
            }
        },
        onSettled: (data, error, { clipId }) => {
            // Invalidate to ensure consistency
            queryClient.invalidateQueries({
                queryKey: clipKeys.detail(clipId),
            });
            queryClient.invalidateQueries({
                queryKey: clipKeys.lists(),
            });
        },
    });
}
