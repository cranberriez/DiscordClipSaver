"use client";

import { AuthorWithStats } from "@/lib/api/author";
import { FullClip } from "@/lib/api/clip";
import { UserAvatar } from "@/components/core/UserAvatar";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { SharePopover } from "./SharePopover";

interface InfoBarProps {
    vidTitle: string;
    author?: AuthorWithStats;
    message: FullClip["message"];
    clip: FullClip["clip"];
    onPrevious?: () => void;
    onNext?: () => void;
    onShowInfo: () => void;
}

export function InfoBar({
    vidTitle,
    author,
    message,
    clip,
    onPrevious,
    onNext,
    onShowInfo,
}: InfoBarProps) {
    return (
        <div className="bg-background border-t">
            <div className="max-w-[95vw] 2xl:max-w-[1920px] mx-auto px-4 md:px-8 py-4">
                <div className="flex flex-col flex-1">
                    <h2 className="text-xl font-semibold truncate mb-2">
                        {vidTitle}
                    </h2>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 text-base">
                                <UserAvatar
                                    userId={message.author_id}
                                    username={author?.display_name}
                                    avatarUrl={author?.avatar_url ?? undefined}
                                    size="md"
                                    showName={true}
                                />
                                <span>•</span>
                                <span>
                                    Posted{" "}
                                    {formatRelativeTime(message.timestamp)}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onShowInfo}
                                className="gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Info className="w-4 h-4" />
                                <span className="text-xs">Info</span>
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
