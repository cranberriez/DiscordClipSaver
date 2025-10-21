"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipGrid } from "./ClipGrid";
import { ClipModal } from "./ClipModal";
import { useGuilds, useChannels, useClipsInfinite } from "@/lib/hooks";
import type { FullClip } from "@/lib/api/clip";

/**
 * ClipsViewer - Legacy component for browsing clips
 *
 * This component uses the new TanStack Query hooks but maintains
 * the original three-step selection UI (guild → channel → clips).
 *
 * For a better UX, consider using the new /clips routes with
 * client-side filtering instead.
 */
export function ClipsViewer() {
    const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const [selectedClip, setSelectedClip] = useState<FullClip | null>(null);

    // Use TanStack Query hooks
    const { data: guilds, isLoading: guildsLoading } = useGuilds();
    const { data: channels, isLoading: channelsLoading } = useChannels(
        selectedGuild || ""
    );
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: clipsLoading,
    } = useClipsInfinite({
        guildId: selectedGuild || "",
        channelId: selectedChannel || undefined,
        limit: 50,
    });

    // Flatten paginated clips
    const allClips = data?.pages.flatMap(page => page.clips) ?? [];

    const handleGuildSelect = (guildId: string) => {
        setSelectedGuild(guildId);
        setSelectedChannel(null);
    };

    return (
        <div className="space-y-6">
            {/* Guild Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Server</CardTitle>
                </CardHeader>
                <CardContent>
                    {guildsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading servers...
                        </div>
                    ) : !guilds || guilds.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No servers found
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {guilds.map(guild => (
                                <Button
                                    key={guild.id}
                                    variant={
                                        selectedGuild === guild.id
                                            ? "default"
                                            : "outline"
                                    }
                                    className="h-auto py-4 justify-start"
                                    onClick={() => handleGuildSelect(guild.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {guild.icon_url && (
                                            <img
                                                src={guild.icon_url}
                                                alt={guild.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                        )}
                                        <span className="font-medium">
                                            {guild.name}
                                        </span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Channel Selection */}
            {selectedGuild && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Channel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {channelsLoading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Loading channels...
                            </div>
                        ) : !channels || channels.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No channels found
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                {channels.map(channel => (
                                    <Button
                                        key={channel.id}
                                        variant={
                                            selectedChannel === channel.id
                                                ? "default"
                                                : "outline"
                                        }
                                        className="justify-start"
                                        onClick={() =>
                                            setSelectedChannel(channel.id)
                                        }
                                    >
                                        <span className="truncate">
                                            #{channel.name}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Clips Grid */}
            {selectedChannel && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Clips ({allClips.length}
                            {hasNextPage && "+"})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {clipsLoading && allClips.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Loading clips...
                            </div>
                        ) : allClips.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                No clips found in this channel
                            </div>
                        ) : (
                            <>
                                <ClipGrid
                                    clips={allClips}
                                    onClipClick={setSelectedClip}
                                />
                                {hasNextPage && (
                                    <div className="mt-6 text-center">
                                        <Button
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            variant="outline"
                                        >
                                            {isFetchingNextPage
                                                ? "Loading..."
                                                : "Load More"}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Clip Modal */}
            {selectedClip && (
                <ClipModal
                    clip={selectedClip}
                    onClose={() => setSelectedClip(null)}
                />
            )}
        </div>
    );
}
