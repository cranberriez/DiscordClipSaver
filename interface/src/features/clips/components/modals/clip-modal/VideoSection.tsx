"use client";

import { VideoPlayer } from "../../VideoPlayer";
import { Button } from "@/components/ui/button";

interface VideoSectionProps {
    isRefreshing: boolean;
    shouldRefetch: boolean;
    hasPlaybackError: boolean;
    videoUrl: string;
    posterUrl?: string | null;
    clipTitle: string;
    onError: () => void;
    onPlayerReady: (player: any) => void;
}

export function VideoSection({
    isRefreshing,
    shouldRefetch,
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
                {shouldRefetch && isRefreshing ? (
                    <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
                        <p className="text-muted-foreground text-center px-4">
                            Refreshing video URL...
                        </p>
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
