"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Clip, Message, Thumbnail } from "@/lib/db/types";

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
    const [isExpired, setIsExpired] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // Check if URL is expired
        const expiresAt = new Date(clip.expires_at);
        const now = new Date();
        setIsExpired(expiresAt < now);
    }, [clip.expires_at]);

    const refreshCdnUrl = async () => {
        try {
            setRefreshing(true);
            const response = await fetch(`/api/clips/${clip.id}/refresh-cdn`, {
                method: "POST",
            });

            if (!response.ok) throw new Error("Failed to refresh CDN URL");

            const data = await response.json();
            setVideoUrl(data.cdn_url);
            setIsExpired(false);
        } catch (error) {
            console.error("Error refreshing CDN URL:", error);
            alert("Failed to refresh video URL. Please try again.");
        } finally {
            setRefreshing(false);
        }
    };

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
        const largeThumb = clip.thumbnails.find((t) => t.size_type === "large");
        if (largeThumb) {
            // Use API route to serve thumbnails from storage
            // storage_path is like "thumbnails/guild_xxx/file.webp"
            return `/api/storage/${largeThumb.storage_path}`;
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
                        {isExpired ? (
                            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
                                <p className="text-muted-foreground">
                                    Video URL has expired
                                </p>
                                <Button
                                    onClick={refreshCdnUrl}
                                    disabled={refreshing}
                                >
                                    {refreshing ? "Refreshing..." : "Refresh URL"}
                                </Button>
                            </div>
                        ) : (
                            <video
                                controls
                                className="w-full rounded-lg"
                                poster={getLargeThumbnail() || undefined}
                                preload="metadata"
                            >
                                <source src={videoUrl} type={clip.mime_type} />
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Clip Information</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">File Size:</span>
                                    <span className="ml-2">{formatFileSize(clip.file_size)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Resolution:</span>
                                    <span className="ml-2">{clip.resolution || "Unknown"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Duration:</span>
                                    <span className="ml-2">
                                        {clip.duration ? `${clip.duration.toFixed(1)}s` : "Unknown"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">MIME Type:</span>
                                    <span className="ml-2">{clip.mime_type}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Created:</span>
                                    <span className="ml-2">{formatDate(clip.created_at)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Expires:</span>
                                    <span className="ml-2">{formatDate(clip.expires_at)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Message Information</h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Message ID:</span>
                                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                                        {clip.message.id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Author ID:</span>
                                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                                        {clip.message.author_id}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Timestamp:</span>
                                    <span className="ml-2">{formatDate(clip.message.timestamp)}</span>
                                </div>
                                {clip.message.content && (
                                    <div>
                                        <span className="text-muted-foreground">Content:</span>
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
                                {clip.thumbnails.map((thumb) => (
                                    <Badge key={thumb.id} variant="secondary">
                                        {thumb.size_type} ({thumb.width}x{thumb.height})
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
                                            file_size: clip.file_size.toString(),
                                            mime_type: clip.mime_type,
                                            duration: clip.duration,
                                            resolution: clip.resolution,
                                            cdn_url: clip.cdn_url,
                                            expires_at: clip.expires_at,
                                            thumbnail_status: clip.thumbnail_status,
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
