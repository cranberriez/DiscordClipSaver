"use client";

import {
    MediaPlayer,
    MediaProvider,
    type MediaPlayerInstance,
} from "@vidstack/react";
import {
    defaultLayoutIcons,
    DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useCallback, useEffect, useRef } from "react";
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
    const player = useRef<MediaPlayerInstance>(null);
    const isInitialMount = useRef(true);

    // Get persisted state from store
    const { volume, muted, setVolume, setMuted } = useVideoPlayerStore();

    // Expose player instance to parent if requested
    useEffect(() => {
        if (player.current && onPlayerReady) {
            onPlayerReady(player.current);
        }
    }, [onPlayerReady]);

    const videoSrc = useCallback((url: string) => {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === "cdn.discordapp.com") {
                return url.replace(
                    "cdn.discordapp.com",
                    "media.discordapp.net"
                );
            }
            return url;
        } catch {
            return url;
        }
    }, []);

    const transformedSrc = videoSrc(src);

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
                    ref={player}
                    title={title || "Video"}
                    src={{ src: transformedSrc, type: "video/mp4" }}
                    poster={poster}
                    playsInline
                    autoPlay
                    crossOrigin="anonymous"
                    volume={volume}
                    muted={muted}
                    onVolumeChange={detail => {
                        // Ignore the very first event if it's the default 1.0 and we have a custom volume
                        // This prevents the player's default initialization from overwriting our stored state
                        if (isInitialMount.current) {
                            isInitialMount.current = false;
                            if (detail.volume === 1 && volume !== 1) {
                                return;
                            }
                        }

                        // Only update if significantly different to avoid float precision loops
                        if (Math.abs(detail.volume - volume) > 0.001) {
                            setVolume(detail.volume);
                        }
                        if (detail.muted !== muted) {
                            setMuted(detail.muted);
                        }
                    }}
                    onError={onError}
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
