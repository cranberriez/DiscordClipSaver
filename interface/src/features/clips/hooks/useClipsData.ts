"use client";

import { useEffect, useMemo } from "react";
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
    } = useClipFiltersStore();

    // Only enable data tied to a guild after hydration so URL wins over persisted store
    const effectiveGuildId = hydrated ? selectedGuildId || "" : "";

    const { data: guilds = [], isLoading: guildsLoading } =
        useGuildsWithClipCount();

    const { data: channels = [], isLoading: channelsLoading } =
        useChannelStats(effectiveGuildId);

    const { data: authors = [] } = useAuthorStats(effectiveGuildId);

    const authorMap = useMemo(
        () => new Map(authors.map(a => [a.user_id, a])),
        [authors]
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
        sort: sortOrder,
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
    ]);

    const allClips = clipsQuery.data?.pages.flatMap(p => p.clips) ?? [];

    const filteredClips = useMemo(() => {
        if (!searchQuery.trim()) return allClips;
        const query = searchQuery.toLowerCase();
        return allClips.filter(clip => {
            const messageContent = clip.message.content?.toLowerCase() || "";
            const filename = clip.clip.filename.toLowerCase();
            const author = authorMap.get(clip.message.author_id);
            const authorName = author?.display_name.toLowerCase() || "";
            return (
                messageContent.includes(query) ||
                filename.includes(query) ||
                authorName.includes(query)
            );
        });
    }, [allClips, searchQuery, authorMap]);

    const selectedGuild = guilds.find(g => g.id === selectedGuildId);

    return {
        guilds,
        guildsLoading,
        channels,
        channelsLoading,
        authors,
        authorMap,
        selectedGuild,
        filteredClips,
        allClipCount: allClips.length,
        clipsQuery,
    } as const;
}
