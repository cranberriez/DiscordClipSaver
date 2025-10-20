"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Guild, Channel, Clip, Message, Thumbnail } from "@/lib/api/types";
import { ClipGrid } from "./ClipGrid";
import { ClipModal } from "./ClipModal";

interface ClipWithMetadata extends Clip {
    message: Message;
    thumbnails: Thumbnail[];
}

interface ClipsResponse {
    clips: ClipWithMetadata[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}

export function ClipsViewer() {
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [clips, setClips] = useState<ClipWithMetadata[]>([]);
    const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const [selectedClip, setSelectedClip] = useState<ClipWithMetadata | null>(
        null
    );
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        offset: 0,
        limit: 50,
        total: 0,
        hasMore: false,
    });

    // Fetch guilds on mount
    useEffect(() => {
        fetchGuilds();
    }, []);

    // Fetch channels when guild is selected
    useEffect(() => {
        if (selectedGuild) {
            fetchChannels(selectedGuild);
        } else {
            setChannels([]);
            setSelectedChannel(null);
        }
    }, [selectedGuild]);

    // Fetch clips when channel is selected
    useEffect(() => {
        if (selectedGuild && selectedChannel) {
            fetchClips(selectedGuild, selectedChannel, 0);
        } else {
            setClips([]);
        }
    }, [selectedChannel]);

    const fetchGuilds = async () => {
        try {
            const response = await fetch("/api/guilds");
            if (!response.ok) throw new Error("Failed to fetch guilds");
            const data = await response.json();
            setGuilds(data.guilds);
        } catch (error) {
            console.error("Error fetching guilds:", error);
        }
    };

    const fetchChannels = async (guildId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/guilds/${guildId}/channels`);
            if (!response.ok) throw new Error("Failed to fetch channels");
            const data = await response.json();
            setChannels(data.channels);
        } catch (error) {
            console.error("Error fetching channels:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClips = async (
        guildId: string,
        channelId: string,
        offset: number
    ) => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/guilds/${guildId}/clips?channelId=${channelId}&limit=50&offset=${offset}`
            );
            if (!response.ok) throw new Error("Failed to fetch clips");
            const data: ClipsResponse = await response.json();

            if (offset === 0) {
                setClips(data.clips);
            } else {
                setClips(prev => [...prev, ...data.clips]);
            }

            setPagination(data.pagination);
        } catch (error) {
            console.error("Error fetching clips:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (selectedGuild && selectedChannel && pagination.hasMore) {
            fetchClips(
                selectedGuild,
                selectedChannel,
                pagination.offset + pagination.limit
            );
        }
    };

    return (
        <div className="space-y-6">
            {/* Guild Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Server</CardTitle>
                </CardHeader>
                <CardContent>
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
                                onClick={() => {
                                    setSelectedGuild(guild.id);
                                    setSelectedChannel(null);
                                }}
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
                </CardContent>
            </Card>

            {/* Channel Selection */}
            {selectedGuild && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Channel</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
            )}

            {/* Clips Grid */}
            {selectedChannel && (
                <Card>
                    <CardHeader>
                        <CardTitle>Clips ({pagination.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && clips.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Loading clips...
                            </div>
                        ) : clips.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                No clips found in this channel
                            </div>
                        ) : (
                            <>
                                <ClipGrid
                                    clips={clips}
                                    onClipClick={setSelectedClip}
                                />
                                {pagination.hasMore && (
                                    <div className="mt-6 text-center">
                                        <Button
                                            onClick={loadMore}
                                            disabled={loading}
                                            variant="outline"
                                        >
                                            {loading
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
