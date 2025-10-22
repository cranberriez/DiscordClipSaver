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
}

export function VideoPlayer({ src, poster, title, onError }: VideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const { volume, setVolume } = useVideoPlayerStore();
    
    // Subscribe to Vidstack's volume state
    const currentVolume = useMediaStore(playerRef)?.volume;

    // Use the CDN URL as-is (no CORS transformation needed without crossOrigin attribute)
    const videoSrc = src;

    // Sync Vidstack volume changes to our store
    useEffect(() => {
        if (currentVolume !== undefined && currentVolume !== volume) {
            console.log("Volume changed via Vidstack:", currentVolume);
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

        return () => {
            player.removeEventListener("error", handleError);
        };
    }, [onError]);

    return (
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
        >
            <MediaProvider />
            <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
    );
}
