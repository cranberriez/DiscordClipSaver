"use client";

import { useEffect, useState } from "react";
import { useClipsUrlSync } from "@/features/clips/hooks/useClipsUrlSync";
import { useClipsData } from "@/features/clips/hooks/useClipsData";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/features/clips/components/FilterBar";
import { ClipGrid } from "@/features/clips";
import {
    GuildSelectModal,
    ChannelSelectModal,
    AuthorSelectModal,
    ClipModal,
} from "@/features/clips/components/modals";
import { useClipFiltersStore } from "@/features/clips/stores/useClipFiltersStore";
import { Navbar } from "@/components/composite/navbar";
import type { FullClip } from "@/lib/api/types";

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
    const { selectedGuildId, openGuildModal } = useClipFiltersStore();

    // URL <-> Store synchronization and page param
    const { hydrated, page, setPage } = useClipsUrlSync();

    // Centralized data fetching that waits for hydration and targets page
    const {
        guilds,
        guildsLoading,
        channels,
        channelsLoading,
        authors,
        authorMap,
        selectedGuild,
        filteredClips,
        allClipCount,
        clipsQuery,
    } = useClipsData({ hydrated, targetPage: page });

    const [selectedClip, setSelectedClip] = useState<FullClip | null>(null);
    const [clipIndex, setClipIndex] = useState<number>(-1);

    // Auto-open guild modal if no guild selected
    useEffect(() => {
        if (!selectedGuildId && !guildsLoading) {
            openGuildModal();
        }
    }, [selectedGuildId, guildsLoading, openGuildModal]);

    // Keep URL page param in sync with number of loaded pages
    useEffect(() => {
        if (!hydrated) return;
        const pagesLoaded = clipsQuery.data?.pages.length ?? 0;
        if (pagesLoaded > 0 && pagesLoaded !== page) {
            setPage(pagesLoaded);
        }
    }, [hydrated, clipsQuery.data?.pages.length, page, setPage]);

    return (
        <>
            {/* Full-screen clips grid background */}
            <div className="flex flex-col h-screen inset-0 bg-background">
                <Navbar noLines />
                <FilterBar
                    guildName={selectedGuild?.name}
                    channelCount={channels.length}
                    authorCount={authors.length}
                />
                <ClipGrid
                    clips={filteredClips}
                    authorMap={authorMap}
                    setClipIndex={setClipIndex}
                    setSelectedClip={setSelectedClip}
                    hasNextPage={clipsQuery.hasNextPage}
                    isFetchingNextPage={clipsQuery.isFetchingNextPage}
                    fetchNextPage={clipsQuery.fetchNextPage}
                />
            </div>

            {/* Content overlays for states (when no clips or loading) */}
            <ErrorOverlay
                selectedGuildId={selectedGuildId}
                clipsLoading={clipsQuery.isLoading}
                clipsError={clipsQuery.error}
                filteredClips={filteredClips}
                openGuildModal={openGuildModal}
                allClipCount={allClipCount}
            />

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

                                  // Load more clips if we're near the end and more are available
                                  if (
                                      newIndex >= filteredClips.length - 2 &&
                                      clipsQuery.hasNextPage &&
                                      !clipsQuery.isFetchingNextPage
                                  ) {
                                      clipsQuery.fetchNextPage();
                                  }
                              }
                            : undefined
                    }
                    authorMap={authorMap}
                />
            )}
        </>
    );
}

function ErrorOverlay({
    selectedGuildId,
    clipsLoading,
    clipsError,
    filteredClips,
    openGuildModal,
    allClipCount,
}: {
    selectedGuildId: string | null;
    clipsLoading: boolean;
    clipsError: Error | null;
    filteredClips: FullClip[];
    openGuildModal: () => void;
    allClipCount: number;
}) {
    if (!selectedGuildId) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto">
                <div className="text-center py-24">
                    <h2 className="text-2xl font-bold mb-4">
                        No Server Selected
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        Please select a server to view clips
                    </p>
                    <Button onClick={openGuildModal}>Select Server</Button>
                </div>
            </div>
        );
    }

    if (clipsLoading) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto">
                <div className="text-center py-24 text-muted-foreground">
                    Loading clips...
                </div>
            </div>
        );
    }

    if (clipsError) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto">
                <div className="text-center py-24 text-destructive">
                    Error loading clips. Please try again.
                </div>
            </div>
        );
    }

    if (filteredClips.length === 0) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto">
                <div className="text-center py-24 text-muted-foreground">
                    <p>
                        {allClipCount === 0
                            ? "No clips found in this server."
                            : "No clips match your search."}
                    </p>
                    <p className="text-sm mt-2">
                        {allClipCount === 0
                            ? "Clips will appear here after the bot scans your channels."
                            : "Try adjusting your search query."}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
