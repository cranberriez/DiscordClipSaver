import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
	clipKeys,
	patchClipAcrossLists,
	patchClipDetail,
} from "@/lib/queries/clip";
import type { Tag, FullClip } from "@/lib/api/clip";

export const tagKeys = {
	all: ["tags"] as const,
	byGuild: (guildId: string) => [...tagKeys.all, "guild", guildId] as const,
};

/**
 * Hook to fetch all tags for a guild.
 */
export function useGuildTags(
	guildId: string,
	includeInactive: boolean = false
) {
	return useQuery({
		queryKey: [...tagKeys.byGuild(guildId), includeInactive],
		queryFn: () => api.tags.list(guildId, includeInactive),
		enabled: !!guildId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Hook to create a new tag for a guild.
 */
export function useCreateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guildId,
			name,
			color,
		}: {
			guildId: string;
			name: string;
			color?: string | null;
		}) => {
			return api.tags.create(guildId, { name, color });
		},
		onSuccess: (newTag, { guildId }) => {
			// Invalidate guild tags query
			queryClient.invalidateQueries({
				queryKey: tagKeys.byGuild(guildId),
			});

			// Optimistically update list for both active-only and all lists
			// We iterate over queries starting with the guild key
			queryClient.setQueriesData<Tag[]>(
				{ queryKey: tagKeys.byGuild(guildId) },
				(oldTags) => {
					if (!oldTags) return [newTag];
					return [...oldTags, newTag].sort((a, b) =>
						a.name.localeCompare(b.name)
					);
				}
			);
		},
	});
}

/**
 * Hook to update a tag.
 */
export function useUpdateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guildId,
			tagId,
			data,
		}: {
			guildId: string;
			tagId: string;
			data: { name?: string; color?: string | null; is_active?: boolean };
		}) => {
			return api.tags.update(guildId, tagId, data);
		},
		onSuccess: (updatedTag, { guildId }) => {
			// Invalidate all guild tag queries
			queryClient.invalidateQueries({
				queryKey: tagKeys.byGuild(guildId),
			});

			// Optimistically update all matching queries
			queryClient.setQueriesData<Tag[]>(
				{ queryKey: tagKeys.byGuild(guildId) },
				(oldTags) => {
					if (!oldTags) return [updatedTag];
					return oldTags.map((t) =>
						t.id === updatedTag.id ? updatedTag : t
					);
				}
			);
		},
	});
}

/**
 * Hook to delete a tag from a guild.
 */
export function useDeleteGuildTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guildId,
			tagId,
		}: {
			guildId: string;
			tagId: string;
		}) => {
			return api.tags.delete(guildId, tagId);
		},
		onSuccess: (_, { guildId, tagId }) => {
			// Invalidate guild tags query
			queryClient.invalidateQueries({
				queryKey: tagKeys.byGuild(guildId),
			});

			// Optimistically update all matching queries
			queryClient.setQueriesData<Tag[]>(
				{ queryKey: tagKeys.byGuild(guildId) },
				(oldTags) => {
					if (!oldTags) return [];
					return oldTags.filter((t) => t.id !== tagId);
				}
			);
		},
	});
}

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
			const tagIds = tags.map((t) => t.id);
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
			const getCurrentTags = (): string[] => {
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

			// Create a set for deduplication
			const tagSet = new Set(currentTags);
			newTags.forEach((t) => tagSet.add(t.slug));

			const updatedTags = Array.from(tagSet);

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
			const tagIds = tags.map((t) => t.id);
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
			const getCurrentTags = (): string[] => {
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
			const removeSlugs = new Set(tagsToRemove.map((t) => t.slug));
			const updatedTags = currentTags.filter((t) => !removeSlugs.has(t));

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
