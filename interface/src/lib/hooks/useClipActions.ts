import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	clipKeys,
	patchClipDetail,
	patchClipAcrossLists,
	removeClipFromLists,
} from "@/lib/queries/clip";
import { FullClip } from "@/lib/api/clip";

export function useUpdateVisibility() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			clipId,
			visibility,
		}: {
			clipId: string;
			visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
		}) => {
			const res = await fetch(`/api/clips/${clipId}/visibility`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ visibility }),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to update visibility");
			}

			return res.json();
		},
		onMutate: async ({ clipId, visibility }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: clipKeys.detail(clipId),
			});
			await queryClient.cancelQueries({ queryKey: clipKeys.lists() });

			// Snapshot previous value
			const previousClip = queryClient.getQueryData<FullClip>(
				clipKeys.detail(clipId)
			);

			// Optimistic update
			patchClipDetail(queryClient, clipId, { visibility });
			patchClipAcrossLists(queryClient, clipId, { visibility });

			return { previousClip };
		},
		onError: (error, { clipId }, context) => {
			toast.error(error.message);
			// Rollback
			if (context?.previousClip) {
				patchClipDetail(queryClient, clipId, {
					visibility: context.previousClip.clip.visibility,
				});
				patchClipAcrossLists(queryClient, clipId, {
					visibility: context.previousClip.clip.visibility,
				});
			}
		},
		onSettled: (_, __, { clipId }) => {
			// Only invalidate detail to ensure consistency
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(clipId),
			});
			// Do NOT invalidate lists to prevent re-randomization
		},
		onSuccess: (_, variables) => {
			toast.success(
				`Visibility updated to ${variables.visibility.toLowerCase()}`
			);
		},
	});
}

export function useArchiveClip() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (clipId: string) => {
			const res = await fetch(`/api/clips/${clipId}/archive`, {
				method: "POST",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to archive clip");
			}

			return res.json();
		},
		onMutate: async (clipId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: clipKeys.detail(clipId),
			});
			await queryClient.cancelQueries({ queryKey: clipKeys.lists() });

			// Snapshot previous value
			const previousClip = queryClient.getQueryData<FullClip>(
				clipKeys.detail(clipId)
			);

			// Optimistic update
			const now = new Date();
			patchClipDetail(queryClient, clipId, { deleted_at: now });
			patchClipAcrossLists(queryClient, clipId, { deleted_at: now });

			return { previousClip };
		},
		onError: (error, clipId, context) => {
			toast.error(error.message);
			// Rollback
			if (context?.previousClip) {
				patchClipDetail(queryClient, clipId, {
					deleted_at: context.previousClip.clip.deleted_at,
				});
				patchClipAcrossLists(queryClient, clipId, {
					deleted_at: context.previousClip.clip.deleted_at,
				});
			}
		},
		onSettled: (_, __, clipId) => {
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(clipId),
			});
			// Do NOT invalidate lists
		},
		onSuccess: () => {
			toast.success("Clip archived");
		},
	});
}

export function useUnarchiveClip() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (clipId: string) => {
			const res = await fetch(`/api/clips/${clipId}/archive`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to unarchive clip");
			}

			return res.json();
		},
		onMutate: async (clipId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: clipKeys.detail(clipId),
			});
			await queryClient.cancelQueries({ queryKey: clipKeys.lists() });

			// Snapshot previous value
			const previousClip = queryClient.getQueryData<FullClip>(
				clipKeys.detail(clipId)
			);

			// Optimistic update
			patchClipDetail(queryClient, clipId, { deleted_at: null });
			patchClipAcrossLists(queryClient, clipId, { deleted_at: null });

			return { previousClip };
		},
		onError: (error, clipId, context) => {
			toast.error(error.message);
			// Rollback
			if (context?.previousClip) {
				patchClipDetail(queryClient, clipId, {
					deleted_at: context.previousClip.clip.deleted_at,
				});
				patchClipAcrossLists(queryClient, clipId, {
					deleted_at: context.previousClip.clip.deleted_at,
				});
			}
		},
		onSettled: (_, __, clipId) => {
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(clipId),
			});
			// Do NOT invalidate lists
		},
		onSuccess: () => {
			toast.success("Clip unarchived");
		},
	});
}

export function useDeleteClip() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (clipId: string) => {
			const res = await fetch(`/api/clips/${clipId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to delete clip");
			}

			return res.json();
		},
		onMutate: async (clipId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: clipKeys.detail(clipId),
			});
			await queryClient.cancelQueries({ queryKey: clipKeys.lists() });

			// Snapshot isn't strictly necessary for delete if we don't plan to undo,
			// but good practice if we wanted to support undo.
			// For now, we just remove it from the list optimistically.

			// We won't remove from detail cache immediately in case user is viewing it?
			// Actually if they delete it, they probably shouldn't see it.

			removeClipFromLists(queryClient, clipId);
		},
		onSuccess: (_, clipId) => {
			toast.success("Clip deleted");
			queryClient.removeQueries({
				queryKey: clipKeys.detail(clipId),
			});
			// Lists already updated in onMutate
		},
		onError: (error) => {
			toast.error(error.message);
			// If we implemented undo/rollback, we would put it back here.
			// Since we don't have the full clip object easily available unless we snapshotted it,
			// easiest rollback for delete is invalidating lists to refetch.
			queryClient.invalidateQueries({ queryKey: clipKeys.lists() });
		},
	});
}

export function useRenameClip() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			clipId,
			title,
		}: {
			clipId: string;
			title: string;
		}) => {
			const res = await fetch(`/api/clips/${clipId}/title`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title }),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to rename clip");
			}

			return res.json();
		},
		onMutate: async ({ clipId, title }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: clipKeys.detail(clipId),
			});
			await queryClient.cancelQueries({ queryKey: clipKeys.lists() });

			// Snapshot previous value
			const previousClip = queryClient.getQueryData<FullClip>(
				clipKeys.detail(clipId)
			);

			// Optimistic update
			patchClipDetail(queryClient, clipId, { title });
			patchClipAcrossLists(queryClient, clipId, { title });

			return { previousClip };
		},
		onError: (error, { clipId }, context) => {
			toast.error(error.message);
			// Rollback
			if (context?.previousClip) {
				patchClipDetail(queryClient, clipId, {
					title: context.previousClip.clip.title,
				});
				patchClipAcrossLists(queryClient, clipId, {
					title: context.previousClip.clip.title,
				});
			}
		},
		onSettled: (_, __, { clipId }) => {
			// Only invalidate detail to ensure consistency
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(clipId),
			});
			// Do NOT invalidate lists to prevent re-randomization
		},
		onSuccess: () => {
			toast.success("Clip renamed");
		},
	});
}
