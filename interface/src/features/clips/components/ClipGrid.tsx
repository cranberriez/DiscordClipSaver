"use client";

import type { Clip, Message, Thumbnail } from "@/lib/api/types";

interface ClipWithMetadata extends Clip {
    message: Message;
    thumbnails: Thumbnail[];
}

interface ClipGridProps {
    clips: ClipWithMetadata[];
    onClipClick: (clip: ClipWithMetadata) => void;
}

export function ClipGrid({ clips, onClipClick }: ClipGridProps) {
    const getThumbnailUrl = (clip: ClipWithMetadata): string | null => {
        const smallThumb = clip.thumbnails.find(t => t.size === "small");
        if (smallThumb) {
            // Use API route to serve thumbnails from storage
            // storage_path is like "thumbnails/guild_xxx/file.webp"
            return `/api/storage/${smallThumb.url}`;
        }
        return null;
    };

    const formatDuration = (seconds: number | null): string => {
        if (!seconds) return "Unknown";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const formatFileSize = (bytes: bigint | number): string => {
        const size = Number(bytes);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clips.map(clip => {
                const thumbnailUrl = getThumbnailUrl(clip);

                return (
                    <div
                        key={clip.id}
                        className="group relative cursor-pointer rounded-lg overflow-hidden border bg-card hover:shadow-lg transition-all"
                        onClick={() => onClipClick(clip)}
                    >
                        {/* Thumbnail */}
                        <div className="aspect-video bg-muted relative">
                            {thumbnailUrl ? (
                                <img
                                    src={thumbnailUrl}
                                    alt={clip.filename}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <svg
                                        className="w-12 h-12"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                            )}

                            {/* Duration overlay */}
                            {clip.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                                    {formatDuration(clip.duration)}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <p
                                className="text-sm font-medium truncate"
                                title={clip.filename}
                            >
                                {clip.filename}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                <span>{formatFileSize(clip.file_size)}</span>
                                {clip.resolution && (
                                    <span>{clip.resolution}</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
