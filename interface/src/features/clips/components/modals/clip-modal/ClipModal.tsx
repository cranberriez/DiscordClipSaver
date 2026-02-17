"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { InfoModal } from "./InfoModal";
import { useLatestVideoUrl } from "@/features/clips/hooks/useLatestVideoUrl";
import { useClip } from "@/lib/hooks/useClips";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { FullClip } from "@/lib/api/clip";
import type { AuthorWithStats } from "@/lib/api/author";
import { formatClipName } from "../../../lib/formatClipName";
import { messageTitleOrFilename } from "@/features/clips/lib/discordText";
import { CloseButton } from "./CloseButton";
import { VideoSection } from "./VideoSection";
import { InfoBar } from "./InfoBar";

interface ClipModalProps {
    clip: FullClip;
    onClose: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
    authorMap?: Map<string, AuthorWithStats>;
    channelMap?: Map<string, ChannelWithStats>;
    /** Optional neighbor URLs for direction-aware preloading */
    prevUrl?: string;
    nextUrl?: string;
}

/**
 * ClipModal - Full-screen video player modal for clips
 *
 * Features:
 * - Full viewport (100vh/100vw) modal
 * - 16:9 video player at top
 * - Floating info bar with clip name, author, and navigation
 * - Expandable details section for full metadata
 * - Automatically refetches clip data if CDN URL is expired
 */
export function ClipModal({
    clip: initialClip,
    onClose,
    onPrevious,
    onNext,
    authorMap,
    channelMap,
    prevUrl,
    nextUrl,
}: ClipModalProps) {
    // Fetch fresh clip data to ensure updates (like renaming) are reflected immediately
    const { data: freshClip } = useClip(
        initialClip.clip.guild_id,
        initialClip.clip.id,
        {
            initialData: initialClip,
            // Prevent immediate refetch on mount since we have initial data
            // invalidation from rename/delete will still trigger updates
            staleTime: 5 * 60 * 1000,
        }
    );

    const effectiveClip = freshClip ?? initialClip;
    const { message, thumbnail } = effectiveClip;
    const author = authorMap?.get(message.author_id);
    const channel = channelMap?.get(message.channel_id);

    const latest = useLatestVideoUrl(effectiveClip);
    const clip = effectiveClip.clip;

    const [videoUrl, setVideoUrl] = useState<string>(
        latest.url ?? clip.cdn_url
    );
    const [hasPlaybackError, setHasPlaybackError] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const vidTitle = messageTitleOrFilename(
        message?.content,
        formatClipName(clip.filename),
        clip.title
    );

    // Update video URL when clip changes (for navigation)
    useEffect(() => {
        const url = latest.url ?? clip.cdn_url;
        setVideoUrl(url);
        // If we have a refresh error, treat it as a playback error immediately
        if (latest.isError) {
            setHasPlaybackError(true);
        } else {
            setHasPlaybackError(false);
        }
    }, [latest.url, clip.cdn_url, clip.id, latest.isError]);

    // Keep a reference to the Vidstack player instance
    const [playerInstance, setPlayerInstance] = useState<any>(null);

    // =============================
    // Direction-aware preloading
    // =============================
    const [lastDirection, setLastDirection] = useState<"next" | "prev" | null>(
        null
    );
    const preloadTimerRef = useRef<number | null>(null);
    const preloadedSetRef = useRef<Set<string>>(new Set());
    const [preloadUrl, setPreloadUrl] = useState<string | null>(null);

    // Debounced selection of which URL to preload based on last direction
    useEffect(() => {
        if (!lastDirection) return;
        // pick candidate based on last direction; fallback: other direction
        const candidate = lastDirection === "next" ? nextUrl : prevUrl;
        const fallback = lastDirection === "next" ? prevUrl : nextUrl;
        const urlToPreload = candidate || fallback || null;
        if (!urlToPreload) return;
        if (preloadedSetRef.current.has(urlToPreload)) return;

        if (preloadTimerRef.current)
            window.clearTimeout(preloadTimerRef.current);
        preloadTimerRef.current = window.setTimeout(() => {
            preloadedSetRef.current.add(urlToPreload);
            setPreloadUrl(urlToPreload);
        }, 300);

        return () => {
            if (preloadTimerRef.current)
                window.clearTimeout(preloadTimerRef.current);
        };
    }, [lastDirection, nextUrl, prevUrl]);

    // Hidden native video element to warm the browser cache/buffer
    const PreloadBucket = () => {
        if (!preloadUrl) return null;
        return (
            <video
                src={preloadUrl}
                preload="auto"
                playsInline
                muted
                style={{ display: "none" }}
                onError={() => {
                    // If preload fails, allow retries on future direction changes
                    preloadedSetRef.current.delete(preloadUrl);
                }}
            />
        );
    };

    // Keyboard navigation + spacebar play/pause when modal has focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Ignore if user is typing in an input/textarea or using modifier keys
            const target = e.target as HTMLElement | null;
            const isTypingTarget =
                !!target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.getAttribute("contenteditable") === "true");
            if (isTypingTarget || e.ctrlKey || e.metaKey || e.altKey) return;

            // If details modal is open, ignore global shortcuts and let it handle Esc
            if (showDetailsModal) return;

            if ((e.key === "ArrowLeft" || key === "a") && onPrevious) {
                e.preventDefault();
                onPrevious();
                return;
            }
            if ((e.key === "ArrowRight" || key === "d") && onNext) {
                e.preventDefault();
                onNext();
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }
            // Spacebar toggles play/pause on the player even if it's not focused

            // TODO: fix, doesn't work after player src changes using next/prev buttons

            // if (e.code === "Space" || e.key === " ") {
            //     const p: any = playerInstance;
            //     if (
            //         p &&
            //         typeof p.play === "function" &&
            //         typeof p.pause === "function"
            //     ) {
            //         e.preventDefault();
            //         const isPaused =
            //             (p.state?.paused ?? p.paused ?? true) === true;
            //         if (isPaused) {
            //             p.play?.();
            //         } else {
            //             p.pause?.();
            //         }
            //     }
            // }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onPrevious, onNext, onClose, playerInstance, showDetailsModal]);

    // (Removed old refresh effect; handled by useLatestVideoUrl)

    const handleVideoError = useCallback(() => {
        // Simple error handling - CDN refresh is now automatic on server
        setHasPlaybackError(true);
        console.error("Video playback error for clip:", clip.id);
    }, [clip.id]);

    const getThumbnailUrl = (): string | null => {
        const largeThumbnail = thumbnail?.filter(t => t.size === "large")[0];
        const smallThumbnail = thumbnail?.filter(t => t.size === "small")[0];

        if (!largeThumbnail && !smallThumbnail) {
            return null;
        }

        if (largeThumbnail && largeThumbnail.url) {
            return `/api/storage/${largeThumbnail.url}`;
        }
        if (smallThumbnail && smallThumbnail.url) {
            return `/api/storage/${smallThumbnail.url}`;
        }
        return null;
    };

    return (
        <DialogPrimitive.Root
            open={true}
            onOpenChange={open => {
                if (!open) onClose();
            }}
        >
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

                {/* Content */}
                <DialogPrimitive.Content
                    className="fixed inset-0 z-50 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    onInteractOutside={e => {
                        // If child/details modal is open, ignore outside interactions for the parent
                        if (showDetailsModal) e.preventDefault();
                    }}
                    onPointerDownOutside={e => {
                        // If child/details modal is open, ignore outside pointer down for the parent
                        if (showDetailsModal) e.preventDefault();
                    }}
                    onEscapeKeyDown={e => {
                        // When details modal is open, don't close the parent on Esc
                        if (showDetailsModal) {
                            e.preventDefault();
                            return;
                        }
                        e.preventDefault();
                        onClose();
                    }}
                >
                    {/* Visually hidden title for accessibility */}
                    <DialogPrimitive.Title className="sr-only">
                        {vidTitle}
                    </DialogPrimitive.Title>

                    {/* Close Button - Fixed top right */}
                    <CloseButton onClose={onClose} />

                    {/* Main Content Container */}
                    <div className="h-full flex flex-col max-h-screen min-h-0">
                        {/* Video Player Section - 16:9 aspect ratio, centered */}
                        <VideoSection
                            isRefreshing={latest.isLoading}
                            hasPlaybackError={hasPlaybackError}
                            videoUrl={videoUrl}
                            posterUrl={getThumbnailUrl()}
                            clipTitle={clip.filename}
                            clipId={clip.id}
                            onError={handleVideoError}
                            onPlayerReady={setPlayerInstance}
                        />

                        {/* Info Bar - Floating below video */}
                        <InfoBar
                            vidTitle={vidTitle}
                            author={author}
                            channelName={channel?.name}
                            message={message}
                            clip={clip}
                            fullClip={effectiveClip}
                            onPrevious={
                                onPrevious
                                    ? () => {
                                          setLastDirection("prev");
                                          onPrevious();
                                      }
                                    : undefined
                            }
                            onNext={
                                onNext
                                    ? () => {
                                          setLastDirection("next");
                                          onNext();
                                      }
                                    : undefined
                            }
                            onShowInfo={() => setShowDetailsModal(true)}
                        />
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>

            {/* Details Modal */}
            {showDetailsModal && (
                <InfoModal
                    open={showDetailsModal}
                    onOpenChange={setShowDetailsModal}
                    clip={clip}
                    message={message}
                    thumbnail={thumbnail}
                    initialClip={effectiveClip}
                />
            )}

            {/* Hidden preloader video to warm next likely clip */}
            <PreloadBucket />
        </DialogPrimitive.Root>
    );
}
