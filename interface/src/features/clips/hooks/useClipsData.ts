"use client";

import { useDeferredValue, useEffect, useMemo, useRef } from "react";
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
		tags,
		searchQuery,
		sortOrder,
		sortType,
		favoritesOnly,
	} = useClipFiltersStore();

	const deferredSearchQuery = useDeferredValue(searchQuery);

	// Per-shuffle seed for random sort. Generated once and held stable across
	// paginated requests so the random order is deterministic (server sorts by
	// md5(clip.id || seed)); a fresh seed is minted whenever the user newly
	// selects "random", giving a new shuffle. Kept out of the persisted filter
	// store on purpose — it is ephemeral UI state, not a shareable filter.
	const genSeed = () =>
		Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const randomSeedRef = useRef<string>(genSeed());
	const prevSortTypeRef = useRef(sortType);
	if (sortType === "random" && prevSortTypeRef.current !== "random") {
		randomSeedRef.current = genSeed();
	}
	prevSortTypeRef.current = sortType;
	const randomSeed =
		sortType === "random" ? randomSeedRef.current : undefined;

	// Use selectedGuildId immediately if available, but still wait for hydration for other URL params
	// This prevents the race condition where URL hydrates before Zustand store on first navigation
	const effectiveGuildId = selectedGuildId || "";

	const { data: guilds = [], isLoading: guildsLoading } =
		useGuildsWithClipCount();

	const {
		data: channels = [],
		isLoading: channelsLoading,
		error: channelsError,
	} = useChannelStats(effectiveGuildId);

	const { data: authors = [], error: authorsError } =
		useAuthorStats(effectiveGuildId);

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
		tags: tags.length > 0 ? tags : undefined,
		searchQuery: deferredSearchQuery.trim() || undefined,
		limit: 50,
		sortOrder: sortOrder,
		sortType: sortType,
		favorites: favoritesOnly,
		seed: randomSeed,
	});

	const {
		data: clipsData,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = clipsQuery;

	useEffect(() => {
		if (!hydrated) return;
		const want = Math.max(1, Math.floor(targetPage));
		const have = clipsData?.pages.length ?? 0;
		if (hasNextPage && have < want && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [
		hydrated,
		targetPage,
		clipsData?.pages.length,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
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

		return clips;
	}, [allClips, selectedAuthorIds, authors.length]);

	const selectedGuild = guilds.find((g) => g.id === selectedGuildId);

	return {
		guilds,
		guildsLoading,
		channels,
		channelsLoading,
		channelsError,
		authors,
		authorsError,
		authorMap,
		channelMap,
		selectedGuild,
		filteredClips,
		allClipCount: allClips.length,
		clipsQuery,
	} as const;
}
