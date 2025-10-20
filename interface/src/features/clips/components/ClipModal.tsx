"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "./VideoPlayer";
import type { Clip, Message, Thumbnail } from "@/lib/api/types";

interface ClipWithMetadata extends Clip {
    message: Message;
    thumbnails: Thumbnail[];
}

interface ClipModalProps {
    clip: ClipWithMetadata;
    onClose: () => void;
}

export function ClipModal({ clip, onClose }: ClipModalProps) {
    const [videoUrl, setVideoUrl] = useState<string>(clip.cdn_url);
    const [hasPlaybackError, setHasPlaybackError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefreshed, setAutoRefreshed] = useState(false);
    const [errorRefreshAttempted, setErrorRefreshAttempted] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [deletionMessage, setDeletionMessage] = useState<string>("");

    const refreshCdnUrl = useCallback(
        async (isFromPlaybackError: boolean = false) => {
            try {
                setRefreshing(true);
                setHasPlaybackError(false);
                setIsDeleted(false);
                const response = await fetch(
                    `/api/clips/${clip.id}/refresh-cdn`,
                    {
                        method: "POST",
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();

                    // Check if this is a deletion error
                    if (
                        response.status === 410 &&
                        errorData.error_type === "MESSAGE_DELETED"
                    ) {
                        setIsDeleted(true);
                        setDeletionMessage(
                            errorData.error ||
                                "This clip was deleted from Discord and is no longer available"
                        );
                        return; // Don't throw, just set state
                    }

                    const errorMsg =
                        errorData.details ||
                        errorData.error ||
                        "Failed to refresh CDN URL";
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                setVideoUrl(data.cdn_url);
                // Reset error flags on success
                setErrorRefreshAttempted(false);
            } catch (error) {
                console.error("Error refreshing CDN URL:", error);

                // If this was triggered by playback error, show playback error UI
                // If this was user-triggered, show alert
                if (isFromPlaybackError) {
                    setHasPlaybackError(true);
                } else {
                    const errorMsg =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    alert(
                        `Failed to refresh video URL: ${errorMsg}\n\nPlease check that the bot is running and try again.`
                    );
                    setHasPlaybackError(true);
                }
            } finally {
                setRefreshing(false);
            }
        },
        [clip.id]
    );

    const handleVideoError = useCallback(async () => {
        // When video fails to load, first check if Discord CDN returns 404
        // Only refresh (call bot API) if the file is actually gone from Discord
        if (errorRefreshAttempted || refreshing) {
            setHasPlaybackError(true);
            return;
        }

        try {
            // Check if Discord CDN URL is valid (HEAD request = no download)
            const cdnCheck = await fetch(videoUrl, { method: "HEAD" });

            if (cdnCheck.status === 404 || cdnCheck.status === 403) {
                // Discord CDN says file is gone - likely deleted
                // Now check with bot to confirm and queue cleanup
                setErrorRefreshAttempted(true);
                refreshCdnUrl(true); // isFromPlaybackError = true
            } else {
                // CDN URL is valid - this is a playback error (codec, browser support, etc.)
                setHasPlaybackError(true);
            }
        } catch (error) {
            // CORS error or network issue checking CDN
            // Just show playback error - don't spam bot API
            console.warn("Could not check Discord CDN:", error);
            setHasPlaybackError(true);
        }
    }, [videoUrl, errorRefreshAttempted, refreshing, refreshCdnUrl]);

    useEffect(() => {
        // Auto-refresh if URL is expired
        const expiresAt = new Date(clip.expires_at);
        const now = new Date();
        const isExpired = expiresAt < now;

        if (isExpired && !autoRefreshed) {
            setAutoRefreshed(true);
            refreshCdnUrl(false);
        }
    }, [clip.expires_at, autoRefreshed, refreshCdnUrl]);

    const formatDate = (date: Date | string): string => {
        return new Date(date).toLocaleString();
    };

    const formatFileSize = (bytes: bigint | number): string => {
        const size = Number(bytes);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getLargeThumbnail = (): string | null => {
        const largeThumb = clip.thumbnails.find(t => t.size === "large");
        if (largeThumb) {
            // Use API route to serve thumbnails from storage
            // storage_path is like "thumbnails/guild_xxx/file.webp"
            return `/api/storage/${largeThumb.url}`;
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
                        {refreshing ? (
                            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
                                <p className="text-muted-foreground text-center px-4">
                                    Refreshing video URL...
                                </p>
                            </div>
                        ) : isDeleted ? (
                            <div className="aspect-video bg-destructive/10 border-2 border-destructive/20 rounded-lg flex flex-col items-center justify-center gap-4 p-6">
                                <div className="text-destructive text-5xl">
                                    🗑️
                                </div>
                                <p className="text-destructive font-semibold text-lg text-center">
                                    Clip Deleted
                                </p>
                                <p className="text-destructive/80 text-sm text-center max-w-md">
                                    {deletionMessage}
                                </p>
                                <p className="text-muted-foreground text-xs text-center max-w-md mt-2">
                                    The original Discord message was deleted.
                                    This clip and its data will be removed from
                                    the database automatically.
                                </p>
                            </div>
                        ) : hasPlaybackError ? (
                            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
                                <p className="text-muted-foreground text-center px-4">
                                    Video cannot be played
                                </p>
                                <p className="text-sm text-muted-foreground text-center px-4">
                                    This may be due to an unsupported video
                                    codec (HEVC/H.265) or a playback error.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => refreshCdnUrl(false)}
                                        disabled={refreshing}
                                        variant="outline"
                                    >
                                        Retry
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            window.open(videoUrl, "_blank")
                                        }
                                        variant="default"
                                    >
                                        Download Video
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <VideoPlayer
                                src={videoUrl}
                                poster={getLargeThumbnail() || undefined}
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
                                        {clip.message.id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Author ID:
                                    </span>
                                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                                        {clip.message.author_id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Timestamp:
                                    </span>
                                    <span className="ml-2">
                                        {formatDate(clip.message.created_at)}
                                    </span>
                                </div>
                                {clip.message.content && (
                                    <div>
                                        <span className="text-muted-foreground">
                                            Content:
                                        </span>
                                        <p className="mt-1 bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                                            {clip.message.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Thumbnails</h3>
                            <div className="flex gap-2">
                                {clip.thumbnails.map(thumb => (
                                    <Badge key={thumb.url} variant="secondary">
                                        {thumb.size} ({thumb.width}x
                                        {thumb.height})
                                    </Badge>
                                ))}
                                {clip.thumbnails.length === 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        No thumbnails available
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
                                {JSON.stringify(
                                    {
                                        clip: {
                                            id: clip.id,
                                            filename: clip.filename,
                                            file_size:
                                                clip.file_size.toString(),
                                            mime_type: clip.mime_type,
                                            duration: clip.duration,
                                            resolution: clip.resolution,
                                            cdn_url: clip.cdn_url,
                                            expires_at: clip.expires_at,
                                            created_at: clip.created_at,
                                        },
                                        message: clip.message,
                                        thumbnails: clip.thumbnails,
                                    },
                                    null,
                                    2
                                )}
                            </pre>
                        </details>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
