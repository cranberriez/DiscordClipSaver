"use client";

import { VideoPlayer } from "../../VideoPlayer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface VideoSectionProps {
    isRefreshing: boolean;
    hasPlaybackError: boolean;
    videoUrl: string;
    posterUrl?: string | null;
    clipTitle: string;
    clipId: string;
    onError: () => void;
    onPlayerReady: (player: any) => void;
}

export function VideoSection({
    isRefreshing,
    hasPlaybackError,
    videoUrl,
    posterUrl,
    clipTitle,
    onError,
    onPlayerReady,
}: VideoSectionProps) {
    return (
        <div className="flex-1 flex items-center justify-center px-2 py-4 md:px-4 md:py-6 min-h-0 overflow-hidden">
            <div className="flex items-center justify-center w-full h-full max-w-[98vw] max-h-full 2xl:max-w-none">
                {isRefreshing ? (
                    <div className="aspect-video w-full h-full max-h-full rounded-lg flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-neutral-900/50 to-neutral-800/50 backdrop-blur-sm border border-white/5 shadow-xl">
                        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                            <Loader2 className="w-8 h-8 text-primary/80 animate-spin" />
                            <div className="space-y-1 text-center">
                                <p className="text-lg font-medium text-foreground/90">
                                    Refreshing Stream
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Getting a fresh link from Discord...
                                </p>
                            </div>
                        </div>
                    </div>
                ) : hasPlaybackError ? (
                    <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
                        <p className="text-muted-foreground text-center px-4">
                            Video cannot be played
                        </p>
                        <p className="text-sm text-muted-foreground text-center px-4">
                            This may be due to an expired CDN URL, unsupported
                            video codec (HEVC/H.265) for your browser, or the
                            clip was deleted from Discord.
                        </p>
                        <Button
                            onClick={() => window.open(videoUrl, "_blank")}
                            variant="default"
                        >
                            Download Video
                        </Button>
                    </div>
                ) : (
                    <VideoPlayer
                        src={videoUrl}
                        poster={posterUrl || undefined}
                        title={clipTitle}
                        onError={onError}
                        onPlayerReady={onPlayerReady}
                    />
                )}
            </div>
        </div>
    );
}
