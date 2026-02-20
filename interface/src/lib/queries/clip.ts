import {
	queryOptions,
	infiniteQueryOptions,
	type QueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ClipListParams, ClipListResponse, FullClip } from "@/lib/api/clip";

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query keys for clips.
 *
 * Key Strategy:
 * - Individual clips: ['clips', clipId] - Allows sharing across different lists
 * - Filtered clips: ['clips', 'list', { guildId, channelIds?, authorIds?, sortOrder, sortType }]
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
		params: Omit<ClipListParams, "channelIds" | "limit" | "offset">
	) => [...clipKeys.lists(), { ...params }] as const,

	// List by specific channels with optional author filter
	byChannels: (params: Omit<ClipListParams, "limit" | "offset">) =>
		[...clipKeys.lists(), { ...params }] as const,

	// Single clip detail
	detail: (clipId: string) => [...clipKeys.all, clipId] as const,
};

// ============================================================================
// Query Options
// ============================================================================

/**
 * Query options for fetching clips with pagination.
 * Supports filtering by channels, authors, favorites, and sorting.
 */
export const clipsQuery = (params: ClipListParams) =>
	queryOptions<ClipListResponse>({
		queryKey:
			params.channelIds && params.channelIds.length > 0
				? clipKeys.byChannels({
						guildId: params.guildId,
						channelIds: params.channelIds,
						authorIds: params.authorIds,
						tagsAny: params.tagsAny,
						tagsAll: params.tagsAll,
						tagsExclude: params.tagsExclude,
						sortOrder: params.sortOrder,
						sortType: params.sortType,
						favorites: params.favorites,
					})
				: clipKeys.byGuild({
						guildId: params.guildId,
						authorIds: params.authorIds,
						tagsAny: params.tagsAny,
						tagsAll: params.tagsAll,
						tagsExclude: params.tagsExclude,
						sortOrder: params.sortOrder,
						sortType: params.sortType,
						favorites: params.favorites,
					}),
		queryFn: () => api.clips.list(params),
		enabled: !!params.guildId,
		staleTime: 60_000, // 1 minute
	});

/**
 * Infinite query options for clips with "Load More" pagination.
 * This is the recommended approach for clips viewing.
 */
export const clipsInfiniteQuery = (params: ClipListParams) =>
	infiniteQueryOptions<ClipListResponse>({
		queryKey:
			params.channelIds && params.channelIds.length > 0
				? clipKeys.byChannels({
						guildId: params.guildId,
						channelIds: params.channelIds,
						authorIds: params.authorIds,
						tagsAny: params.tagsAny,
						tagsAll: params.tagsAll,
						tagsExclude: params.tagsExclude,
						sortOrder: params.sortOrder,
						sortType: params.sortType,
						favorites: params.favorites,
					})
				: clipKeys.byGuild({
						guildId: params.guildId,
						authorIds: params.authorIds,
						tagsAny: params.tagsAny,
						tagsAll: params.tagsAll,
						tagsExclude: params.tagsExclude,
						sortOrder: params.sortOrder,
						sortType: params.sortType,
						favorites: params.favorites,
					}),
		queryFn: ({ pageParam }) =>
			api.clips.list({
				...params,
				offset: pageParam as number,
			}),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
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

// ============================================================================
// Cache patch helpers (minimal invalidation)
// ============================================================================

export type ClipPatch = {
	cdn_url?: string;
	expires_at?: string | Date;
	tags?: string[];
	title?: string | null;
	visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
	deleted_at?: string | Date | null;
};

/** Patch the single-clip detail cache. */
export function patchClipDetail(
	qc: QueryClient,
	clipId: string,
	patch: ClipPatch
) {
	qc.setQueryData<FullClip | undefined>(clipKeys.detail(clipId), (old) => {
		if (!old) return old;
		const normalized: ClipPatch = { ...patch };
		if (
			normalized.expires_at &&
			typeof normalized.expires_at === "string"
		) {
			normalized.expires_at = new Date(normalized.expires_at);
		}

		const { tags, ...clipUpdates } = normalized;

		return {
			...old,
			clip: { ...old.clip, ...clipUpdates },
			tags: tags ?? old.tags,
		} as FullClip;
	});
}

/** Patch a specific infinite list (by current params). */
export function patchClipInInfiniteList(
	qc: QueryClient,
	params: ClipListParams,
	clipId: string,
	patch: ClipPatch
) {
	const listKey =
		params.channelIds && params.channelIds.length > 0
			? clipKeys.byChannels({
					guildId: params.guildId,
					channelIds: params.channelIds,
					authorIds: params.authorIds,
					sortOrder: params.sortOrder,
					sortType: params.sortType,
					favorites: params.favorites,
				})
			: clipKeys.byGuild({
					guildId: params.guildId,
					authorIds: params.authorIds,
					sortOrder: params.sortOrder,
					sortType: params.sortType,
					favorites: params.favorites,
				});

	qc.setQueryData<
		| { pages: { clips: any[]; pagination?: any }[]; pageParams: any[] }
		| undefined
	>(listKey, (old) => {
		if (!old) return old;
		const pages = old.pages.map((page) => ({
			...page,
			clips: page.clips.map((c) => {
				if (c.clip.id !== clipId) return c;
				const normalized: ClipPatch = { ...patch };
				if (
					normalized.expires_at &&
					typeof normalized.expires_at === "string"
				) {
					normalized.expires_at = new Date(normalized.expires_at);
				}

				const { tags, ...clipUpdates } = normalized;

				return {
					...c,
					clip: { ...c.clip, ...clipUpdates },
					tags: tags ?? c.tags,
				};
			}),
		}));
		return { ...old, pages };
	});
}

/** Optionally patch across all list variants under clips/lists (if clip can appear in many). */
export function patchClipAcrossLists(
	qc: QueryClient,
	clipId: string,
	patch: ClipPatch
) {
	qc.setQueriesData<{ pages: { clips: any[] }[]; pageParams: any[] }>(
		{ queryKey: clipKeys.lists(), exact: false },
		(old) => {
			if (!old) return old;
			const pages = old.pages.map((page) => ({
				...page,
				clips: page.clips.map((c) => {
					if (c.clip.id !== clipId) return c;
					const normalized: ClipPatch = { ...patch };
					if (
						normalized.expires_at &&
						typeof normalized.expires_at === "string"
					) {
						normalized.expires_at = new Date(normalized.expires_at);
					}

					const { tags, ...clipUpdates } = normalized;

					return {
						...c,
						clip: { ...c.clip, ...clipUpdates },
						tags: tags ?? c.tags,
					};
				}),
			}));
			return { ...old, pages };
		}
	);
}

/** Remove a clip from all list variants under clips/lists. */
export function removeClipFromLists(qc: QueryClient, clipId: string) {
	qc.setQueriesData<{ pages: { clips: any[] }[]; pageParams: any[] }>(
		{ queryKey: clipKeys.lists(), exact: false },
		(old) => {
			if (!old) return old;
			const pages = old.pages.map((page) => ({
				...page,
				clips: page.clips.filter((c) => c.clip.id !== clipId),
			}));
			return { ...old, pages };
		}
	);
}
