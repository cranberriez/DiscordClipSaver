"use client";

import { MediaPlayer, MediaProvider, useMediaStore } from "@vidstack/react";
import {
    defaultLayoutIcons,
    DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { useVideoPlayerStore } from "../stores/useVideoPlayerStore";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    onError?: () => void;
    onPlayerReady?: (player: any) => void;
    /** Unique key to force remount on clip changes */
    clipId?: string;
}

export function VideoPlayer({
    src,
    poster,
    title,
    onError,
    onPlayerReady,
    clipId,
}: VideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const { volume, setVolume } = useVideoPlayerStore();
    const [currentSrc, setCurrentSrc] = useState(src);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const volumeInitializedRef = useRef(false);
    const lastAppliedVolumeRef = useRef<number | null>(null);

    // Subscribe to Vidstack's volume state (with null check)
    const mediaStore = useMediaStore(playerRef);
    const currentVolume = mediaStore?.volume;

    // Debounced source update to prevent rapid switching issues
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // If source hasn't changed, no need to debounce
        if (src === currentSrc) return;

        // Debounce source changes by 150ms to prevent race conditions
        debounceTimeoutRef.current = setTimeout(() => {
            setCurrentSrc(src);
        }, 150);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [src, currentSrc]);

    // Transform Discord CDN URLs to avoid CORS issues
    const videoSrc = useCallback((url: string) => {
        try {
            const urlObj = new URL(url);

            // For Discord CDN URLs, try to use media.discordapp.net which has better CORS support
            if (urlObj.hostname === "cdn.discordapp.com") {
                return url.replace(
                    "cdn.discordapp.com",
                    "media.discordapp.net"
                );
            }

            return url;
        } catch {
            // If URL parsing fails, return as-is
            return url;
        }
    }, []);

    const transformedSrc = videoSrc(currentSrc);

    // Reset volume init state whenever the underlying player is forced to remount.
    // (The MediaPlayer is keyed by clipId/src, so its internal default volume can change.)
    useEffect(() => {
        volumeInitializedRef.current = false;
        lastAppliedVolumeRef.current = null;
    }, [clipId, transformedSrc]);

    // Apply our persisted volume to the player.
    // Note: Vidstack's `volume` prop isn't reliably "controlled" across remounts, so we
    // also set it imperatively to ensure the new player instance inherits the stored value.
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        // On first initialization for this player instance, always push store -> player.
        if (!volumeInitializedRef.current) {
            try {
                player.volume = volume;
                lastAppliedVolumeRef.current = volume;
            } finally {
                volumeInitializedRef.current = true;
            }
            return;
        }

        // After initialization, keep store -> player in sync (e.g. when store hydrates).
        if (typeof player.volume === "number" && player.volume !== volume) {
            player.volume = volume;
            lastAppliedVolumeRef.current = volume;
        }
    }, [volume]);

    // Sync Vidstack volume changes back to our store (user-initiated changes).
    useEffect(() => {
        if (!volumeInitializedRef.current) return;
        if (currentVolume === undefined) return;

        // Ignore the immediate echo of a store->player write.
        if (
            lastAppliedVolumeRef.current !== null &&
            currentVolume === lastAppliedVolumeRef.current
        ) {
            return;
        }

        if (currentVolume !== volume) {
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
                src: currentSrc,
                clipId,
            });

            // Check for specific error types
            if (
                errorDetail?.message?.includes("decode") ||
                errorDetail?.code === 4 ||
                errorDetail?.message?.includes(
                    "NS_ERROR_DOM_MEDIA_NOT_SUPPORTED_ERR"
                )
            ) {
                console.warn(
                    "Video decode error - likely HEVC/H.265 codec or unsupported format. " +
                        "Try Chrome, Safari, or download the video directly."
                );
            }

            // Check for CORS/network errors
            if (
                errorDetail?.message?.includes("CORS") ||
                errorDetail?.message?.includes("OpaqueResponseBlocking") ||
                event.type === "abort"
            ) {
                console.warn(
                    "Network/CORS error loading video. This may be due to Discord CDN restrictions."
                );
            }

            onError?.();
        };

        const handleLoadStart = () => {
            // Video started loading
        };

        const handleCanPlay = () => {
            // Video can start playing
        };

        const handleAbort = () => {
            console.log("Video loading aborted for:", {
                src: currentSrc,
                clipId,
            });
            // Don't call onError for abort - this is expected during rapid switching
        };

        player.addEventListener("error", handleError);
        player.addEventListener("loadstart", handleLoadStart);
        player.addEventListener("canplay", handleCanPlay);
        player.addEventListener("abort", handleAbort);

        // Expose player instance to parent when ready
        onPlayerReady?.(player);

        return () => {
            player.removeEventListener("error", handleError);
            player.removeEventListener("loadstart", handleLoadStart);
            player.removeEventListener("canplay", handleCanPlay);
            player.removeEventListener("abort", handleAbort);
        };
    }, [onError, onPlayerReady, currentSrc, clipId]);

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
                    key={clipId || transformedSrc} // Force remount on clip changes
                    ref={playerRef}
                    title={title || "Video"}
                    src={{
                        src: transformedSrc,
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
