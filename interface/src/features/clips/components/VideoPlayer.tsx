"use client";

import { MediaPlayer, MediaProvider, useMediaStore } from "@vidstack/react";
import {
    defaultLayoutIcons,
    DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useEffect, useRef } from "react";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    onError?: () => void;
}

export function VideoPlayer({ src, poster, title, onError }: VideoPlayerProps) {
    const playerRef = useRef<any>(null);

    // Use the CDN URL as-is (no CORS transformation needed without crossOrigin attribute)
    const videoSrc = src;

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
            if (errorDetail?.message?.includes('decode') || errorDetail?.code === 4) {
                console.warn(
                    "Video decode error - likely HEVC/H.265 codec which this browser doesn't support. " +
                    "Try Chrome, Safari, or download the video directly."
                );
            }
            
            onError?.();
        };

        const handleSourceChange = (event: any) => {
            console.log("Source changed:", event.detail);
        };

        const handleCanPlay = () => {
            console.log("Video can play");
        };

        const handleProviderChange = (event: any) => {
            console.log("Provider changed:", event.detail);
        };

        player.addEventListener("error", handleError);
        player.addEventListener("source-change", handleSourceChange);
        player.addEventListener("can-play", handleCanPlay);
        player.addEventListener("provider-change", handleProviderChange);

        return () => {
            player.removeEventListener("error", handleError);
            player.removeEventListener("source-change", handleSourceChange);
            player.removeEventListener("can-play", handleCanPlay);
            player.removeEventListener("provider-change", handleProviderChange);
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
        >
            <MediaProvider />
            <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
    );
}
