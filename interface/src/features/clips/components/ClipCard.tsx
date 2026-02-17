"use client";

import type { FullClip } from "@/lib/api/clip";
import type { AuthorWithStats } from "@/lib/api/author";
import { formatClipName } from "../lib/formatClipName";
import { formatDuration, formatRelativeTime } from "@/lib/utils/time-helpers";
import { UserAvatar } from "@/components/core/UserAvatar";
import {
    Heart,
    Play,
    Loader2,
    AlertCircle,
    Lock,
    Link as LinkIcon,
    Archive,
} from "lucide-react";
import Image from "next/image";
import { messageTitleOrFilename } from "@/features/clips/lib/discordText";
import { useImageErrorStore } from "../stores/useImageErrorStore";
import { parseIsoTimestamp } from "@/lib/utils/time-helpers";
import { Thumbnail } from "@/lib/api/clip";
import { ClipOptionsDropdown } from "./ClipOptionsDropdown";
import { useToggleFavorite } from "@/lib/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
        const thumbnail: Thumbnail | undefined =
            clip.thumbnail?.filter(t => t.size === "large")[0] ??
            clip.thumbnail?.filter(t => t.size === "small")[0];

        if (!thumbnail) {
            return null;
        }

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
        formatClipName(clipData.filename),
        clipData.title
    );

    const showThumbnail = thumbnailUrl && !hasTooManyErrors;
    const isExpired =
        parseIsoTimestamp(clip.clip.expires_at) < Date.now() / 1000;

    const thumbnailStatus = clip.clip.thumbnail_status;
    const isProcessing =
        thumbnailStatus === "processing" || thumbnailStatus === "pending";
    const isFailed = thumbnailStatus === "failed";

    const isArchived = !!clip.clip.deleted_at;
    const visibility = clip.clip.visibility;

    // Temporary onclick wrapper for displaying extra data
    const handleClick = () => {
        // console.log("Clip clicked:", clip);
        onClick(clip);
    };

    const toggleFavorite = useToggleFavorite();

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isArchived && !clip.isFavorited) {
            toast.error("Archived clips cannot be favorited");
            return;
        }

        toggleFavorite.mutate(clip.clip.id);
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
            <div className="aspect-video bg-muted relative overflow-hidden rounded-lg flex items-center justify-center">
                {showThumbnail ? (
                    <>
                        <Image
                            src={thumbnailUrl}
                            alt={clipData.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            width={640}
                            height={360}
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
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50 p-4 text-center">
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-8 h-8 mb-2 animate-spin text-primary" />
                                <span className="text-xs font-medium">
                                    Processing...
                                </span>
                            </>
                        ) : isFailed ? (
                            <>
                                <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
                                <span className="text-xs font-medium text-destructive">
                                    Thumbnail Failed
                                </span>
                            </>
                        ) : (
                            <Play className="w-12 h-12 opacity-50" />
                        )}
                    </div>
                )}

                {/* Visibility & Archive Badges */}
                {isArchived ? (
                    <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
                        <Archive className="w-3 h-3" />
                        <span className="font-medium">Archived</span>
                    </div>
                ) : visibility === "PRIVATE" ? (
                    <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
                        <Lock className="w-3 h-3" />
                        <span className="font-medium">Private</span>
                    </div>
                ) : visibility === "UNLISTED" ? (
                    <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
                        <LinkIcon className="w-3 h-3" />
                        <span className="font-medium">Unlisted</span>
                    </div>
                ) : null}

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
                <div className="flex items-center justify-between gap-1">
                    <p
                        className="flex-1 text-sm font-semibold line-clamp-1 overflow-hidden"
                        title={clipData.filename}
                    >
                        {vidTitle}
                    </p>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-medium">
                            {clip.favorite_count}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleFavorite}
                            className="h-6 w-6 rounded-full hover:bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            <Heart
                                className={`w-4 h-4 ${
                                    clip.isFavorited
                                        ? "text-red-500 fill-red-500"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            />
                        </Button>
                    </div>
                    <ClipOptionsDropdown clip={clip} />
                </div>

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
