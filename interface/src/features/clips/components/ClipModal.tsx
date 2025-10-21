"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "./VideoPlayer";
import { useClip } from "@/lib/hooks";
import type { FullClip } from "@/lib/api/clip";

interface ClipModalProps {
    clip: FullClip;
    onClose: () => void;
}

/**
 * ClipModal - Video player modal for clips
 *
 * Automatically refetches clip data if CDN URL is expired.
 * The server-side route handles refreshing expired URLs from Discord.
 */
export function ClipModal({ clip: initialClip, onClose }: ClipModalProps) {
    const { clip: initialClipData, message, thumbnail } = initialClip;

    // Check if URL is expired
    const isExpired = new Date(initialClipData.expires_at) < new Date();

    // Refetch clip if expired (server will refresh CDN URL automatically)
    // Only enable the query if the URL is expired
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
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{clip.filename}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Video Player */}
                    <div className="relative">
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
                                    This may be due to an expired CDN URL,
                                    unsupported video codec (HEVC/H.265), or the
                                    clip was deleted from Discord.
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

                    {/* Metadata */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">
                                Clip Information
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">
                                        File Size:
                                    </span>
                                    <span className="ml-2">
                                        {formatFileSize(clip.file_size)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Resolution:
                                    </span>
                                    <span className="ml-2">
                                        {clip.resolution || "Unknown"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Duration:
                                    </span>
                                    <span className="ml-2">
                                        {clip.duration
                                            ? `${clip.duration.toFixed(1)}s`
                                            : "Unknown"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        MIME Type:
                                    </span>
                                    <span className="ml-2">
                                        {clip.mime_type}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Created:
                                    </span>
                                    <span className="ml-2">
                                        {formatDate(clip.created_at)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Expires:
                                    </span>
                                    <span className="ml-2">
                                        {formatDate(clip.expires_at)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">
                                Message Information
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">
                                        Message ID:
                                    </span>
                                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                                        {message.id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Author ID:
                                    </span>
                                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                                        {message.author_id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Timestamp:
                                    </span>
                                    <span className="ml-2">
                                        {formatDate(message.created_at)}
                                    </span>
                                </div>
                                {message.content && (
                                    <div>
                                        <span className="text-muted-foreground">
                                            Content:
                                        </span>
                                        <p className="mt-1 bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                                            {message.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Thumbnail</h3>
                            <div className="flex gap-2">
                                {thumbnail ? (
                                    <Badge variant="secondary">
                                        {thumbnail.size} ({thumbnail.width}x
                                        {thumbnail.height})
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        No thumbnail available
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Raw Metadata (collapsible) */}
                        <details className="text-sm">
                            <summary className="font-semibold cursor-pointer">
                                Raw Metadata (JSON)
                            </summary>
                            <pre className="mt-2 bg-muted p-4 rounded overflow-x-auto text-xs">
                                {JSON.stringify(initialClip, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
