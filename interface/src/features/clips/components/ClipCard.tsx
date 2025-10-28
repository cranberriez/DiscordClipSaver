"use client";

import type { FullClip } from "@/lib/api/clip";
import type { AuthorWithStats } from "@/lib/api/author";
import { formatClipName } from "../lib/formatClipName";
import { formatDuration, formatRelativeTime } from "@/lib/utils/time-helpers";
import { UserAvatar } from "@/components/core/UserAvatar";
import { Play } from "lucide-react";
import Image from "next/image";
import { messageTitleOrFilename } from "@/features/clips/lib/discordText";
import { useImageErrorStore } from "../stores/useImageErrorStore";
import { parseIsoTimestamp } from "@/lib/utils/time-helpers";

interface ClipCardProps {
    clip: FullClip;
    onClick: (clip: FullClip) => void;
    authorMap?: Map<string, AuthorWithStats>;
    highlighted?: boolean;
}

/**
 * ClipCard displays a single clip with:
 * - 16:9 aspect ratio thumbnail
 * - Duration overlay
 * - Formatted filename
 * - Author avatar and name
 * - Time posted (relative)
 */
export function ClipCard({
    clip,
    onClick,
    authorMap,
    highlighted,
}: ClipCardProps) {
    const { hasTooManyErrors, reportError } = useImageErrorStore();

    const getThumbnailUrl = (): string | null => {
        const thumbnail = clip.thumbnail;
        if (thumbnail && thumbnail.url) {
            return `/api/storage/${thumbnail.url}`;
        }
        return null;
    };

    const thumbnailUrl = getThumbnailUrl();
    const { clip: clipData, message } = clip;
    const author = authorMap?.get(message.author_id);

    const vidTitle = messageTitleOrFilename(
        message?.content,
        formatClipName(clipData.filename)
    );

    const showThumbnail = thumbnailUrl && !hasTooManyErrors;
    const isExpired =
        parseIsoTimestamp(clip.clip.expires_at) < Date.now() / 1000;

    // Temporary onclick wrapper for displaying extra data
    const handleClick = () => {
        console.log("Clip clicked:", clip);
        onClick(clip);
    };

    return (
        <div
            id={`clip-${clip.clip.id}`}
            className={
                "group relative cursor-pointer rounded-lg overflow-hidden hover:shadow-lg hover:bg-muted/20 transition-all" +
                (highlighted ? " ring-2 ring-blue-500" : "")
            }
            onClick={handleClick}
        >
            {/* Thumbnail - 16:9 aspect ratio */}
            <div className="aspect-video bg-muted relative overflow-hidden rounded-lg">
                {showThumbnail ? (
                    <>
                        <Image
                            src={thumbnailUrl}
                            alt={clipData.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            width={320}
                            height={180}
                            unoptimized
                            onError={() => {
                                reportError();
                            }}
                        />
                        {/* Play button overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 rounded-full p-4">
                                <Play className="w-8 h-8 text-black fill-black" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Play className="w-12 h-12" />
                    </div>
                )}

                {/* Duration overlay */}
                {clipData.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(clipData.duration)}
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div className="flex flex-col p-2 gap-2">
                {/* Filename */}
                <p
                    className="text-sm font-semibold line-clamp-1 overflow-hidden"
                    title={clipData.filename}
                >
                    {vidTitle}
                </p>

                {/* Author & Time posted */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <UserAvatar
                        userId={message.author_id}
                        username={author?.display_name}
                        avatarUrl={author?.avatar_url ?? undefined}
                        size="md"
                        showName={true}
                    />
                    <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(message.timestamp)}
                    </p>
                </div>
            </div>

            {isExpired && (
                <div className="absolute top-2 right-2 bg-red-500 p-[2px] rounded-full"></div>
            )}
        </div>
    );
}
