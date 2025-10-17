"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipGrid, ClipModal } from "@/features/clips/";
import type { Channel, Clip, Message, Thumbnail } from "@/lib/db/types";

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

export default function GuildClipsPage() {
    const router = useRouter();
    const params = useParams();
    const guildId = params.guildId as string;

    const [channels, setChannels] = useState<Channel[]>([]);
    const [clips, setClips] = useState<ClipWithMetadata[]>([]);
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

    // Fetch channels on mount
    useEffect(() => {
        if (guildId) {
            fetchChannels(guildId);
        }
    }, [guildId]);

    // Fetch clips when channel is selected
    useEffect(() => {
        if (selectedChannel) {
            fetchClips(guildId, selectedChannel, 0);
        } else {
            setClips([]);
        }
    }, [selectedChannel, guildId]);

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
        if (selectedChannel && pagination.hasMore) {
            fetchClips(
                guildId,
                selectedChannel,
                pagination.offset + pagination.limit
            );
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/clips")}
                    className="mb-4"
                >
                    ← Back to Servers
                </Button>
                <h1 className="text-3xl font-bold">Browse Clips</h1>
                <p className="text-muted-foreground mt-2">
                    Select a channel to view clips
                </p>
            </div>

            <div className="space-y-6">
                {/* Channel Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Channel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && channels.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Loading channels...
                            </div>
                        ) : channels.length === 0 ? (
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
            </div>

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
