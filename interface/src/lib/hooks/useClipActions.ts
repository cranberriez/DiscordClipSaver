import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clipKeys } from "@/lib/queries/clip";

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
		onSuccess: (_, variables) => {
			toast.success(
				`Visibility updated to ${variables.visibility.toLowerCase()}`
			);
			// Invalidate specific clip query
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(variables.clipId),
			});
			// Invalidate list queries since visibility affects list filtering
			queryClient.invalidateQueries({
				queryKey: clipKeys.lists(),
			});
		},
		onError: (error) => {
			toast.error(error.message);
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
		onSuccess: (_, clipId) => {
			toast.success("Clip archived");
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(clipId),
			});
			queryClient.invalidateQueries({
				queryKey: clipKeys.lists(),
			});
		},
		onError: (error) => {
			toast.error(error.message);
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
		onSuccess: (_, clipId) => {
			toast.success("Clip unarchived");
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(clipId),
			});
			queryClient.invalidateQueries({
				queryKey: clipKeys.lists(),
			});
		},
		onError: (error) => {
			toast.error(error.message);
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
		onSuccess: (_, clipId) => {
			toast.success("Clip deleted");
			// Remove from cache directly if possible, or invalidate
			queryClient.removeQueries({
				queryKey: clipKeys.detail(clipId),
			});
			queryClient.invalidateQueries({
				queryKey: clipKeys.lists(),
			});
		},
		onError: (error) => {
			toast.error(error.message);
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
		onSuccess: (_, variables) => {
			toast.success("Clip renamed");
			queryClient.invalidateQueries({
				queryKey: clipKeys.detail(variables.clipId),
			});
			queryClient.invalidateQueries({
				queryKey: clipKeys.lists(),
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
}
