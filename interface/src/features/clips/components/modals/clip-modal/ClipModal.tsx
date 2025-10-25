"use client";

import { useState, useCallback, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { InfoModal } from "./InfoModal";
import { useClip } from "@/lib/hooks";
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
}: ClipModalProps) {
    const { clip: initialClipData, message, thumbnail } = initialClip;
    const author = authorMap?.get(message.author_id);

    // Check if URL is expired
    const isExpired = new Date(initialClipData.expires_at) < new Date();

    // Refetch clip if expired (server will refresh CDN URL automatically)
    const shouldRefetch = isExpired;
    const { data: refreshedClip, isLoading: isRefreshing } = useClip(
        initialClipData.guild_id,
        initialClipData.id
    );

    // Use refreshed clip if available and was needed, otherwise use initial
    const clip =
        shouldRefetch && refreshedClip ? refreshedClip.clip : initialClipData;
    const [videoUrl, setVideoUrl] = useState<string>(clip.cdn_url);
    const [hasPlaybackError, setHasPlaybackError] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const vidTitle = messageTitleOrFilename(
        message?.content,
        formatClipName(clip.filename)
    );

    // Update video URL when clip changes (for navigation)
    useEffect(() => {
        setVideoUrl(clip.cdn_url);
        setHasPlaybackError(false);
    }, [clip.cdn_url, clip.id]);

    // Keep a reference to the Vidstack player instance
    const [playerInstance, setPlayerInstance] = useState<any>(null);

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

    // Update video URL when clip is refreshed
    useEffect(() => {
        if (shouldRefetch && refreshedClip) {
            setVideoUrl(refreshedClip.clip.cdn_url);
            setHasPlaybackError(false);
        }
    }, [shouldRefetch, refreshedClip]);

    const handleVideoError = useCallback(() => {
        // Simple error handling - CDN refresh is now automatic on server
        setHasPlaybackError(true);
        console.error("Video playback error for clip:", clip.id);
    }, [clip.id]);

    const getThumbnailUrl = (): string | null => {
        if (thumbnail && thumbnail.url) {
            // Use API route to serve thumbnails from storage
            return `/api/storage/${thumbnail.url}`;
        }
        return null;
    };

    return (
        <DialogPrimitive.Root open={true} onOpenChange={onClose}>
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
                    <div className="h-full flex flex-col max-h-screen">
                        {/* Video Player Section - 16:9 aspect ratio, centered */}
                        <VideoSection
                            isRefreshing={isRefreshing}
                            shouldRefetch={shouldRefetch}
                            hasPlaybackError={hasPlaybackError}
                            videoUrl={videoUrl}
                            posterUrl={getThumbnailUrl()}
                            clipTitle={clip.filename}
                            onError={handleVideoError}
                            onPlayerReady={setPlayerInstance}
                        />

                        {/* Info Bar - Floating below video */}
                        <InfoBar
                            vidTitle={vidTitle}
                            author={author}
                            message={message}
                            clip={clip}
                            onPrevious={onPrevious}
                            onNext={onNext}
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
                    initialClip={initialClip}
                />
            )}
        </DialogPrimitive.Root>
    );
}
