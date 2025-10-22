"use client";

import { useState, useCallback, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "./VideoPlayer";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useClip } from "@/lib/hooks";
import type { FullClip } from "@/lib/api/clip";
import type { AuthorWithStats } from "@/lib/api/author";
import { formatRelativeTime, formatDuration } from "@/lib/utils/time-helpers";
import { formatClipName } from "../lib/formatClipName";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";

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

    // Update video URL when clip changes (for navigation)
    useEffect(() => {
        setVideoUrl(clip.cdn_url);
        setHasPlaybackError(false);
    }, [clip.cdn_url, clip.id]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && onPrevious) {
                e.preventDefault();
                onPrevious();
            } else if (e.key === "ArrowRight" && onNext) {
                e.preventDefault();
                onNext();
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onPrevious, onNext, onClose]);

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

    const formatDate = (date: Date | string): string => {
        return new Date(date).toLocaleString();
    };

    const formatFileSize = (bytes: bigint | number): string => {
        const size = Number(bytes);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

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
                    onEscapeKeyDown={e => {
                        e.preventDefault();
                        onClose();
                    }}
                >
                    {/* Visually hidden title for accessibility */}
                    <DialogPrimitive.Title className="sr-only">
                        {formatClipName(clip.filename)}
                    </DialogPrimitive.Title>

                    {/* Close Button - Fixed top right */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Main Content Container */}
                    <div className="h-full flex flex-col">
                        {/* Video Player Section - 16:9 aspect ratio, centered */}
                        <div className="flex-1 flex items-center justify-center px-2 py-4 md:px-4 md:py-6">
                            <div className="w-full max-w-[95vw] 2xl:max-w-[1920px]">
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
                                            This may be due to an expired CDN
                                            URL, unsupported video codec
                                            (HEVC/H.265), or the clip was
                                            deleted from Discord.
                                        </p>
                                        <Button
                                            onClick={() =>
                                                window.open(videoUrl, "_blank")
                                            }
                                            variant="default"
                                        >
                                            Download Video
                                        </Button>
                                    </div>
                                ) : (
                                    <VideoPlayer
                                        src={videoUrl}
                                        poster={getThumbnailUrl() || undefined}
                                        title={clip.filename}
                                        onError={handleVideoError}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Info Bar - Floating below video */}
                        <div className="bg-background border-t">
                            <div className="max-w-[95vw] 2xl:max-w-[1920px] mx-auto px-4 md:px-8 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    {/* Left: Clip Info */}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-semibold truncate mb-2">
                                            {formatClipName(clip.filename)}
                                        </h2>
                                        <div className="flex items-center gap-3 text-base">
                                            <UserAvatar
                                                userId={message.author_id}
                                                username={author?.display_name}
                                                avatarUrl={
                                                    author?.avatar_url ??
                                                    undefined
                                                }
                                                size="md"
                                                showName={true}
                                            />
                                            <span>•</span>
                                            <span>
                                                {formatRelativeTime(
                                                    message.timestamp
                                                )}
                                            </span>
                                            {clip.duration && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {formatDuration(
                                                            clip.duration
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                            {clip.resolution && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {clip.resolution}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Navigation Controls */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setShowDetailsModal(true)
                                            }
                                            className="gap-1 text-muted-foreground hover:text-foreground"
                                        >
                                            <Info className="w-4 h-4" />
                                            <span className="text-xs">
                                                Info
                                            </span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={onPrevious}
                                            disabled={!onPrevious}
                                            title="Previous clip"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={onNext}
                                            disabled={!onNext}
                                            title="Next clip"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>

            {/* Details Modal - Separate dialog for metadata */}
            {showDetailsModal && (
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[60] translate-x-[-50%] translate-y-[-50%] w-full max-w-3xl max-h-[85vh] bg-background rounded-lg border shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                        <div className="flex flex-col h-full max-h-[85vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b">
                                <DialogPrimitive.Title className="text-lg font-semibold">
                                    Clip Information
                                </DialogPrimitive.Title>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Close</span>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    {/* Clip Information */}
                                    <div>
                                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                                            Clip Information
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    File Size:
                                                </span>
                                                <span className="font-medium">
                                                    {formatFileSize(
                                                        clip.file_size
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Resolution:
                                                </span>
                                                <span className="font-medium">
                                                    {clip.resolution ||
                                                        "Unknown"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Duration:
                                                </span>
                                                <span className="font-medium">
                                                    {clip.duration
                                                        ? formatDuration(
                                                              clip.duration
                                                          )
                                                        : "Unknown"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    MIME Type:
                                                </span>
                                                <span className="font-medium">
                                                    {clip.mime_type}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Created:
                                                </span>
                                                <span className="font-medium">
                                                    {formatDate(
                                                        clip.created_at
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Expires:
                                                </span>
                                                <span className="font-medium">
                                                    {formatDate(
                                                        clip.expires_at
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Message Information */}
                                    <div>
                                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                                            Message Information
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground block mb-1">
                                                    Message ID:
                                                </span>
                                                <code className="bg-muted px-2 py-1 rounded text-xs block">
                                                    {message.id}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block mb-1">
                                                    Author ID:
                                                </span>
                                                <code className="bg-muted px-2 py-1 rounded text-xs block">
                                                    {message.author_id}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block mb-1">
                                                    Timestamp:
                                                </span>
                                                <span className="font-medium">
                                                    {formatDate(
                                                        message.created_at
                                                    )}
                                                </span>
                                            </div>
                                            {message.content && (
                                                <div>
                                                    <span className="text-muted-foreground block mb-1">
                                                        Content:
                                                    </span>
                                                    <p className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                                                        {message.content}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Thumbnail Info */}
                                    <div>
                                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                                            Thumbnail
                                        </h3>
                                        <div className="flex gap-2">
                                            {thumbnail ? (
                                                <Badge variant="secondary">
                                                    {thumbnail.size} (
                                                    {thumbnail.width}x
                                                    {thumbnail.height})
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    No thumbnail available
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Raw Metadata */}
                                    <div>
                                        <details className="text-sm">
                                            <summary className="font-semibold cursor-pointer text-sm uppercase tracking-wide text-muted-foreground mb-2">
                                                Raw Metadata (JSON)
                                            </summary>
                                            <pre className="mt-2 bg-muted p-4 rounded overflow-x-auto text-xs">
                                                {JSON.stringify(
                                                    initialClip,
                                                    null,
                                                    2
                                                )}
                                            </pre>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            )}
        </DialogPrimitive.Root>
    );
}
