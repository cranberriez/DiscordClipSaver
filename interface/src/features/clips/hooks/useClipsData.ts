"use client";

import { useDeferredValue, useEffect, useMemo } from "react";
import {
	useGuildsWithClipCount,
	useChannelStats,
	useAuthorStats,
	usePrefetchAuthorStats,
	useChannelClipsInfinite,
} from "@/lib/hooks";
import { useClipFiltersStore } from "@/features/clips/stores/useClipFiltersStore";

export function useClipsData(opts: { hydrated: boolean; targetPage?: number }) {
	const { hydrated, targetPage = 1 } = opts;
	const {
		selectedGuildId,
		selectedChannelIds,
		selectedAuthorIds,
		searchQuery,
		sortOrder,
		sortType,
		favoritesOnly,
	} = useClipFiltersStore();

	const deferredSearchQuery = useDeferredValue(searchQuery);

	// Use selectedGuildId immediately if available, but still wait for hydration for other URL params
	// This prevents the race condition where URL hydrates before Zustand store on first navigation
	const effectiveGuildId = selectedGuildId || "";

	const { data: guilds = [], isLoading: guildsLoading } =
		useGuildsWithClipCount();

	const { data: channels = [], isLoading: channelsLoading } =
		useChannelStats(effectiveGuildId);

	const { data: authors = [] } = useAuthorStats(effectiveGuildId);

	const authorMap = useMemo(
		() => new Map(authors.map((a) => [a.user_id, a])),
		[authors]
	);

	const channelMap = useMemo(
		() => new Map(channels.map((c) => [c.id, c])),
		[channels]
	);

	usePrefetchAuthorStats();

	const clipsQuery = useChannelClipsInfinite({
		guildId: effectiveGuildId,
		channelIds:
			selectedChannelIds.length > 0 &&
			selectedChannelIds.length < channels.length
				? selectedChannelIds
				: undefined,
		authorIds:
			selectedAuthorIds.length > 0 &&
			selectedAuthorIds.length < authors.length
				? selectedAuthorIds
				: undefined,
		limit: 50,
		sortOrder: sortOrder,
		sortType: sortType,
		favorites: favoritesOnly,
	});

	useEffect(() => {
		if (!hydrated) return;
		const want = Math.max(1, Math.floor(targetPage));
		const have = clipsQuery.data?.pages.length ?? 0;
		if (
			clipsQuery.hasNextPage &&
			have < want &&
			!clipsQuery.isFetchingNextPage
		) {
			clipsQuery.fetchNextPage();
		}
	}, [
		hydrated,
		targetPage,
		clipsQuery.data?.pages.length,
		clipsQuery.hasNextPage,
		clipsQuery.isFetchingNextPage,
		clipsQuery.fetchNextPage,
	]);

	// Flatten and de-duplicate by clip ID to avoid duplicate renders across pages
	const allClips = useMemo(() => {
		const raw = clipsQuery.data?.pages.flatMap((p) => p.clips) ?? [];
		if (raw.length <= 1) return raw;
		const seen = new Set<string>();
		const unique: typeof raw = [];
		for (const c of raw) {
			const id = c.clip.id;
			if (seen.has(id)) continue;
			seen.add(id);
			unique.push(c);
		}
		return unique;
	}, [clipsQuery.data?.pages]);

	// Pre-compute search index to avoid re-normalizing on every search
	const searchIndex = useMemo(() => {
		const normalize = (str: string) =>
			str.toLowerCase().replace(/[_-]/g, " ");

		return new Map(
			allClips.map((clip) => [
				clip.clip.id,
				{
					content: normalize(clip.message.content || ""),
					filename: normalize(clip.clip.filename),
					title: normalize(clip.clip.title || ""),
					authorName: normalize(
						authorMap.get(clip.message.author_id)?.display_name ||
							""
					),
				},
			])
		);
	}, [allClips, authorMap]);

	const filteredClips = useMemo(() => {
		let clips = allClips;

		// Apply author filtering (client-side)
		if (
			selectedAuthorIds.length > 0 &&
			selectedAuthorIds.length < authors.length
		) {
			clips = clips.filter((clip) =>
				selectedAuthorIds.includes(clip.message.author_id)
			);
		}

		// Apply search query filtering
		const trimmedSearchQuery = deferredSearchQuery.trim();
		if (trimmedSearchQuery) {
			const normalize = (str: string) =>
				str.toLowerCase().replace(/[_-]/g, " ");
			const query = normalize(trimmedSearchQuery);

			clips = clips.filter((clip) => {
				const searchData = searchIndex.get(clip.clip.id);
				if (!searchData) return false;

				return (
					searchData.content.includes(query) ||
					searchData.filename.includes(query) ||
					searchData.title.includes(query) ||
					searchData.authorName.includes(query)
				);
			});
		}

		return clips;
	}, [
		allClips,
		selectedAuthorIds,
		authors.length,
		deferredSearchQuery,
		searchIndex,
	]);

	const selectedGuild = guilds.find((g) => g.id === selectedGuildId);

	return {
		guilds,
		guildsLoading,
		channels,
		channelsLoading,
		authors,
		authorMap,
		channelMap,
		selectedGuild,
		filteredClips,
		allClipCount: allClips.length,
		clipsQuery,
	} as const;
}
