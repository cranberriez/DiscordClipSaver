"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipGrid, ClipModal } from "@/features/clips";
import { ClipFilters } from "@/features/clips/components/ClipFilters";
import { useClipsInfinite, useChannelStats, useGuild } from "@/lib/hooks";
import type { FullClip } from "@/lib/api/clip";
import { PageContainer } from "@/components/layout";

/**
 * Guild Clips Viewer
 *
 * Shows all clips for a guild with client-side filtering:
 * - Filter by channel
 * - Search by message content or filename
 * - Infinite scroll pagination
 *
 * Future enhancements:
 * - Filter by author
 * - Filter by date range
 * - Sort options
 * - Zustand for persistent filter state
 */
export default function GuildClipsPage() {
    const router = useRouter();
    const params = useParams();
    const guildId = params.guildId as string;

    const [selectedClip, setSelectedClip] = useState<FullClip | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch guild info
    const { data: guild } = useGuild(guildId);

    // Fetch clips with server-side channel filtering
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error,
    } = useClipsInfinite({ 
        guildId, 
        channelId: selectedChannelId || undefined,
        limit: 50 
    });

    // Fetch channels for filter dropdown (only show channels with clips)
    const { data: channelsData = [] } = useChannelStats(guildId);
    const channels = channelsData.filter(channel => channel.clip_count > 0);

    // Flatten paginated clips
    const allClips = data?.pages.flatMap(page => page.clips) ?? [];

    // Apply client-side search filter only (channel filter is server-side)
    const filteredClips = searchQuery
        ? allClips.filter(clip => {
              const messageContent = clip.message.content?.toLowerCase() || "";
              const filename = clip.clip.filename.toLowerCase();
              const query = searchQuery.toLowerCase();
              return messageContent.includes(query) || filename.includes(query);
          })
        : allClips;

    const totalClips = allClips.length;
    const filteredCount = filteredClips.length;

    return (
        <PageContainer maxWidth="7xl">
            {/* Header */}
            <div className="mb-8">
                <BackButton text="Back to Servers" url="/clips" className="mb-4" />
                <h1 className="text-3xl font-bold">
                    {guild?.name || "Loading..."}
                </h1>
                <p className="text-muted-foreground mt-2">
                    Browse and watch clips from this server
                </p>
            </div>

            {/* Error State */}
            {error && (
                <Card className="mb-6">
                    <CardContent className="py-12">
                        <div className="text-center text-destructive">
                            Error loading clips. Please try again.
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content */}
            {!error && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <ClipFilters
                            channels={channels}
                            filters={{ channelId: selectedChannelId, searchQuery }}
                            onFiltersChange={(newFilters) => {
                                setSelectedChannelId(newFilters.channelId);
                                setSearchQuery(newFilters.searchQuery);
                            }}
                            totalClips={totalClips}
                            filteredClips={filteredCount}
                        />
                    </div>

                    {/* Clips Grid */}
                    <div className="lg:col-span-3">
                        <Card>
                            <CardContent className="pt-6">
                                {isLoading ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        Loading clips...
                                    </div>
                                ) : filteredClips.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        {allClips.length === 0 ? (
                                            <>
                                                <p>
                                                    {selectedChannelId
                                                        ? "No clips found in this channel."
                                                        : "No clips found in this server."}
                                                </p>
                                                <p className="text-sm mt-2">
                                                    Clips will appear here after
                                                    the bot scans your channels.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p>
                                                    No clips match your search.
                                                </p>
                                                <p className="text-sm mt-2">
                                                    Try adjusting your search query.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <ClipGrid
                                            clips={filteredClips}
                                            onClipClick={setSelectedClip}
                                        />

                                        {/* Load More Button */}
                                        {hasNextPage && (
                                            <div className="mt-6 text-center">
                                                <Button
                                                    onClick={() =>
                                                        fetchNextPage()
                                                    }
                                                    disabled={
                                                        isFetchingNextPage
                                                    }
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
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Clip Modal */}
            {selectedClip && (
                <ClipModal
                    clip={selectedClip}
                    onClose={() => setSelectedClip(null)}
                />
            )}
        </PageContainer>
    );
}
