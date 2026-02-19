"use client";

import { AuthorWithStats } from "@/lib/api/author";
import { FullClip } from "@/lib/api/clip";
import { UserAvatar } from "@/components/core/UserAvatar";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import { Button } from "@/components/ui/button";
import { Heart, Info } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { SharePopover } from "./SharePopover";
import { ClipOptionsDropdown } from "../../ClipOptionsDropdown";
import { useToggleFavorite } from "@/lib/hooks/useFavorites";
import { useFavoriteStatus } from "@/lib/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { TagManager } from "@/features/clips/components/tags/TagManager";
import { useUser } from "@/lib/hooks/useUser";
import { useGuild } from "@/lib/hooks/useGuilds";

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

	// Permissions for TagManager
	const { data: userData } = useUser();
	const { data: guild } = useGuild(clip.guild_id);
	const user = userData?.database;

	const isClipOwner = user?.id === message.author_id;
	const isGuildOwner = user?.id === guild?.owner_id;
	const isAdmin = user?.roles === "admin";
	const canEditTags = isClipOwner || isGuildOwner || isAdmin;

	const handleToggleFavorite = () => {
		toggleFavorite.mutate(clip.id);
	};

	return (
		<div className="bg-background border-t">
			<div className="mx-auto max-w-[95vw] px-4 py-4 md:px-8 2xl:max-w-[1920px]">
				<div className="flex flex-1 flex-col">
					<h2 className="mb-2 truncate text-xl font-semibold">
						{vidTitle}
					</h2>
					<div className="flex items-center justify-between gap-4">
						<div className="flex min-w-0 flex-1 gap-3">
							<UserAvatar
								userId={message.author_id}
								username={author?.display_name}
								avatarUrl={author?.avatar_url ?? undefined}
								size="lg"
								showName={false}
								className="mt-0.5"
							/>
							<div className="flex min-w-0 flex-1 flex-col">
								{/* Metadata Row */}
								<div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
									<span className="text-foreground font-semibold">
										{author?.display_name || "Unknown User"}
									</span>
									<span className="hidden sm:inline">•</span>
									{channelName && (
										<>
											<span>#{channelName}</span>
											<span>•</span>
										</>
									)}
									<span>
										Posted{" "}
										{formatRelativeTime(message.timestamp)}
									</span>
								</div>

								{/* Tags Row */}
								<div className="mt-1">
									<TagManager
										clipId={clip.id}
										guildId={clip.guild_id}
										currentTagSlugs={fullClip.tags || []}
										readOnly={!canEditTags}
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2 self-start">
							<Button
								variant="ghost"
								size="lg"
								onClick={onShowInfo}
								className="text-muted-foreground hover:text-foreground gap-2"
							>
								<Info className="h-4 w-4" />
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
								className="text-muted-foreground hover:text-foreground gap-1"
							>
								<Heart
									className={cn(
										"h-4 w-4",
										isFavorited &&
											"fill-red-500 text-red-600"
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
									<ChevronLeft className="h-4 w-4" />
									<span className="mb-0.5 text-xs">Back</span>
								</Button>
								<Button
									variant="outline"
									onClick={onNext}
									disabled={!onNext}
									size="lg"
									title="Next clip"
									className="cursor-pointer"
								>
									<span className="mb-0.5 text-xs">Next</span>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</ButtonGroup>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
