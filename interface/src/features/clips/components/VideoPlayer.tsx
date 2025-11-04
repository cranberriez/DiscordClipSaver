"use client";

import { MediaPlayer, MediaProvider, useMediaStore } from "@vidstack/react";
import {
    defaultLayoutIcons,
    DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useEffect, useRef } from "react";
import { useVideoPlayerStore } from "../stores/useVideoPlayerStore";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    onError?: () => void;
    onPlayerReady?: (player: any) => void;
}

export function VideoPlayer({
    src,
    poster,
    title,
    onError,
    onPlayerReady,
}: VideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const { volume, setVolume } = useVideoPlayerStore();

    // Subscribe to Vidstack's volume state (with null check)
    const mediaStore = useMediaStore(playerRef);
    const currentVolume = mediaStore?.volume;

    // Use the CDN URL as-is (no CORS transformation needed without crossOrigin attribute)
    const videoSrc = src;

    // Sync Vidstack volume changes to our store
    useEffect(() => {
        if (currentVolume !== undefined && currentVolume !== volume) {
            setVolume(currentVolume);
        }
    }, [currentVolume, volume, setVolume]);

    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const handleError = (event: any) => {
            const errorDetail = event.detail;
            console.error("Video error event:", {
                type: event.type,
                detail: errorDetail,
                error: event.error,
                target: event.target,
            });

            // Check if it's a codec/decode error
            if (
                errorDetail?.message?.includes("decode") ||
                errorDetail?.code === 4
            ) {
                console.warn(
                    "Video decode error - likely HEVC/H.265 codec which this browser doesn't support. " +
                        "Try Chrome, Safari, or download the video directly."
                );
            }

            onError?.();
        };

        player.addEventListener("error", handleError);
        // Expose player instance to parent when ready
        onPlayerReady?.(player);

        return () => {
            player.removeEventListener("error", handleError);
        };
    }, [onError, onPlayerReady]);

    return (
        <div className="w-full h-full max-w-[95vw] max-h-full flex items-center justify-center">
            <div
                className="w-full h-full max-w-full max-h-full"
                style={{
                    aspectRatio: "16 / 9",
                    maxHeight: "min(100%, calc((100vw - 2rem) * 9 / 16))",
                    maxWidth: "min(100%, calc((100vh - 8rem) * 16 / 9))",
                    width: "min(100%, calc((100vh - 8rem) * 16 / 9))",
                    height: "min(100%, calc((100vw - 2rem) * 9 / 16))",
                }}
            >
                <MediaPlayer
                    ref={playerRef}
                    title={title || "Video"}
                    src={{
                        src: videoSrc,
                        type: "video/mp4",
                    }}
                    poster={poster}
                    playsInline
                    autoPlay
                    volume={volume}
                    className="constrained-video-player"
                    style={
                        {
                            width: "100%",
                            height: "100%",
                            maxWidth: "100%",
                            maxHeight: "100%",
                            "--player-width": "100%",
                            "--player-height": "100%",
                            "--media-width": "100%",
                            "--media-height": "100%",
                        } as any
                    }
                >
                    <MediaProvider />
                    <DefaultVideoLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
            </div>
        </div>
    );
}
