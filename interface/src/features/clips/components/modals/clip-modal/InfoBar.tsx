"use client";

import { AuthorWithStats } from "@/lib/api/author";
import { FullClip } from "@/lib/api/clip";
import { UserAvatar } from "@/components/core/UserAvatar";
import { formatRelativeTime, formatDuration } from "@/lib/utils/time-helpers";
import { formatFileSize } from "@/lib/utils/count-helpers";
import { Button } from "@/components/ui/button";
import { Heart, Info } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { SharePopover } from "./SharePopover";
import { ClipOptionsDropdown } from "../../ClipOptionsDropdown";
import { useToggleFavorite } from "@/lib/hooks/useFavorites";
import { useFavoriteStatus } from "@/lib/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface InfoBarProps {
    vidTitle: string;
    author?: AuthorWithStats;
    channelName?: string;
    message: FullClip["message"];
    clip: FullClip["clip"];
    fullClip: FullClip;
    onPrevious?: () => void;
    onNext?: () => void;
    onShowInfo: () => void;
}

export function InfoBar({
    vidTitle,
    author,
    channelName,
    message,
    clip,
    fullClip,
    onPrevious,
    onNext,
    onShowInfo,
}: InfoBarProps) {
    const { data: isFavorited } = useFavoriteStatus(clip.id);
    const toggleFavorite = useToggleFavorite();

    const handleToggleFavorite = () => {
        toggleFavorite.mutate(clip.id);
    };

    return (
        <div className="bg-background border-t">
            <div className="max-w-[95vw] 2xl:max-w-[1920px] mx-auto px-4 md:px-8 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="text-xl font-semibold truncate mb-2">
                        {vidTitle}
                    </h2>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 text-base flex-wrap">
                                <UserAvatar
                                    userId={message.author_id}
                                    username={author?.display_name}
                                    avatarUrl={author?.avatar_url ?? undefined}
                                    size="md"
                                    showName={true}
                                />
                                <span className="text-muted-foreground hidden sm:inline">
                                    •
                                </span>
                                {channelName && (
                                    <>
                                        <span className="text-muted-foreground">
                                            #{channelName}
                                        </span>
                                        <span className="text-muted-foreground">
                                            •
                                        </span>
                                    </>
                                )}
                                <span>
                                    Posted{" "}
                                    {formatRelativeTime(message.timestamp)}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span>{formatDuration(clip.duration)}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{formatFileSize(clip.file_size)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={onShowInfo}
                                className="gap-2 text-muted-foreground hover:text-foreground"
                            >
                                <Info className="w-4 h-4" />
                                <span className="text-xs">Info</span>
                            </Button>

                            <ClipOptionsDropdown
                                clip={fullClip}
                                size="icon-lg"
                                isOnInfoBar={true}
                            />

                            <Button
                                variant="ghost"
                                size="icon-lg"
                                onClick={handleToggleFavorite}
                                className="gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Heart
                                    className={cn(
                                        "w-4 h-4",
                                        isFavorited &&
                                            "text-red-600 fill-red-500"
                                    )}
                                />
                            </Button>

                            <SharePopover
                                guildId={clip.guild_id}
                                channelId={clip.channel_id}
                                messageId={clip.message_id}
                                clipId={clip.id}
                            />

                            <ButtonGroup>
                                <Button
                                    variant="outline"
                                    onClick={onPrevious}
                                    disabled={!onPrevious}
                                    size="lg"
                                    title="Previous clip"
                                    className="cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="text-xs mb-0.5">Back</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onNext}
                                    disabled={!onNext}
                                    size="lg"
                                    title="Next clip"
                                    className="cursor-pointer"
                                >
                                    <span className="text-xs mb-0.5">Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
