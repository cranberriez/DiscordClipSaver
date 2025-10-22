"use client";

import { useEffect, useState, useMemo } from "react";
import {
    useGuildsWithClipCount,
    useChannelStats,
    useChannelClipsInfinite,
    useAuthorStats,
    usePrefetchAuthorStats,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/features/clips/components/FilterBar";
import { ClipCard } from "@/features/clips/components/ClipCard";
import { ClipGrid, ClipModal } from "@/features/clips";
import {
    GuildSelectModal,
    ChannelSelectModal,
    AuthorSelectModal,
} from "@/features/clips/components/modals";
import { useClipFiltersStore } from "@/features/clips/stores/useClipFiltersStore";
import type { FullClip } from "@/lib/api/clip";

/**
 * Centralized Clips Viewer
 *
 * Features:
 * - Persistent filter state with Zustand
 * - Guild/Channel/Author selection modals
 * - Sticky filter bar
 * - Server-side filtering for channels
 * - Client-side search
 * - Infinite scroll pagination
 * - Sort by date (asc/desc)
 */
export default function ClipsPage() {
    const {
        selectedGuildId,
        selectedChannelIds,
        selectedAuthorIds,
        searchQuery,
        sortOrder,
        openGuildModal,
    } = useClipFiltersStore();

    const [selectedClip, setSelectedClip] = useState<FullClip | null>(null);
    const [clipIndex, setClipIndex] = useState<number>(-1);

    // Fetch guilds with clip counts
    const { data: guilds = [], isLoading: guildsLoading } =
        useGuildsWithClipCount();

    // Fetch channels for selected guild
    const { data: channels = [], isLoading: channelsLoading } = useChannelStats(
        selectedGuildId || ""
    );

    // Fetch authors for selected guild
    const { data: authors = [] } = useAuthorStats(selectedGuildId || "");

    // Create author lookup map for O(1) access
    const authorMap = useMemo(
        () => new Map(authors.map(a => [a.user_id, a])),
        [authors]
    );

    // Prefetch hook for authors
    const prefetchAuthors = usePrefetchAuthorStats();

    // Fetch clips with server-side filtering (infinite query)
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: clipsLoading,
        error: clipsError,
    } = useChannelClipsInfinite({
        guildId: selectedGuildId || "",
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

    // Auto-open guild modal if no guild selected
    useEffect(() => {
        if (!selectedGuildId && !guildsLoading) {
            openGuildModal();
        }
    }, [selectedGuildId, guildsLoading, openGuildModal]);

    // Note: Infinite query automatically resets when filters change (query key changes)

    // Get selected guild info
    const selectedGuild = guilds.find(g => g.id === selectedGuildId);

    // Apply client-side search filter only (authors filtered server-side)
    const allClips = data?.pages.flatMap(page => page.clips) ?? [];
    const filteredClips = useMemo(() => {
        if (!searchQuery.trim()) return allClips;

        const query = searchQuery.toLowerCase();
        return allClips.filter((clip: FullClip) => {
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

    // hasNextPage is provided by infinite query

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Filter Bar */}
            <FilterBar
                guildName={selectedGuild?.name}
                channelCount={channels.length}
                authorCount={authors.length}
            />

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {!selectedGuildId ? (
                    <div className="text-center py-24">
                        <h2 className="text-2xl font-bold mb-4">
                            No Server Selected
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Please select a server to view clips
                        </p>
                        <Button onClick={openGuildModal}>Select Server</Button>
                    </div>
                ) : clipsLoading ? (
                    <div className="text-center py-24 text-muted-foreground">
                        Loading clips...
                    </div>
                ) : clipsError ? (
                    <div className="text-center py-24 text-destructive">
                        Error loading clips. Please try again.
                    </div>
                ) : filteredClips.length === 0 ? (
                    <div className="text-center py-24 text-muted-foreground">
                        <p>
                            {allClips.length === 0
                                ? "No clips found in this server."
                                : "No clips match your search."}
                        </p>
                        <p className="text-sm mt-2">
                            {allClips.length === 0
                                ? "Clips will appear here after the bot scans your channels."
                                : "Try adjusting your search query."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Clips Grid */}
                        <ClipGrid
                            clips={filteredClips}
                            authorMap={authorMap}
                            setClipIndex={setClipIndex}
                            setSelectedClip={setSelectedClip}
                        />

                        {/* Load More Button */}
                        {hasNextPage && (
                            <div className="mt-8 text-center">
                                <Button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    variant="outline"
                                    size="lg"
                                >
                                    {isFetchingNextPage
                                        ? "Loading..."
                                        : "Load More Clips"}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <GuildSelectModal guilds={guilds} isLoading={guildsLoading} />
            <ChannelSelectModal
                channels={channels}
                isLoading={channelsLoading}
            />
            <AuthorSelectModal authors={authors} isLoading={false} />

            {/* Clip Modal */}
            {selectedClip && (
                <ClipModal
                    clip={selectedClip}
                    onClose={() => {
                        setSelectedClip(null);
                        setClipIndex(-1);
                    }}
                    onPrevious={
                        clipIndex > 0
                            ? () => {
                                  const newIndex = clipIndex - 1;
                                  setClipIndex(newIndex);
                                  setSelectedClip(filteredClips[newIndex]);
                              }
                            : undefined
                    }
                    onNext={
                        clipIndex < filteredClips.length - 1
                            ? () => {
                                  const newIndex = clipIndex + 1;
                                  setClipIndex(newIndex);
                                  setSelectedClip(filteredClips[newIndex]);
                              }
                            : undefined
                    }
                    authorMap={authorMap}
                />
            )}
        </div>
    );
}
