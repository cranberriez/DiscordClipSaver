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
import { TagManager } from "@/features/clips/components/tags/TagManager";

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
			clip.thumbnail?.filter((t) => t.size === "large")[0] ??
			clip.thumbnail?.filter((t) => t.size === "small")[0];

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
				"group hover:bg-muted/20 relative cursor-pointer overflow-hidden rounded-lg transition-all hover:shadow-lg" +
				(highlighted ? " ring-2 ring-blue-500" : "")
			}
			onClick={handleClick}
		>
			{/* Thumbnail - 16:9 aspect ratio */}
			<div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden rounded-lg">
				{showThumbnail ? (
					<>
						<Image
							src={thumbnailUrl}
							alt={clipData.filename}
							className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
							width={640}
							height={360}
							unoptimized
							onError={() => {
								reportError();
							}}
						/>
						{/* Play button overlay on hover */}
						<div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
							<div className="rounded-full bg-white/90 p-4">
								<Play className="h-8 w-8 fill-black text-black" />
							</div>
						</div>
					</>
				) : (
					<div className="text-muted-foreground bg-muted/50 flex h-full w-full flex-col items-center justify-center p-4 text-center">
						{isProcessing ? (
							<>
								<Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
								<span className="text-xs font-medium">
									Processing...
								</span>
							</>
						) : isFailed ? (
							<>
								<AlertCircle className="text-destructive mb-2 h-8 w-8" />
								<span className="text-destructive text-xs font-medium">
									Thumbnail Failed
								</span>
							</>
						) : (
							<Play className="h-12 w-12 opacity-50" />
						)}
					</div>
				)}

				{/* Visibility & Archive Badges */}
				{isArchived ? (
					<div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white">
						<Archive className="h-3 w-3" />
						<span className="font-medium">Archived</span>
					</div>
				) : visibility === "PRIVATE" ? (
					<div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white">
						<Lock className="h-3 w-3" />
						<span className="font-medium">Private</span>
					</div>
				) : visibility === "UNLISTED" ? (
					<div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white">
						<LinkIcon className="h-3 w-3" />
						<span className="font-medium">Unlisted</span>
					</div>
				) : null}

				{/* Duration overlay */}
				{clipData.duration && (
					<div className="absolute right-2 bottom-2 rounded bg-black/75 px-2 py-1 text-xs text-white">
						{formatDuration(clipData.duration)}
					</div>
				)}
			</div>

			{/* Metadata */}
			<div className="flex flex-col gap-2 p-2">
				{/* Filename */}
				<div className="flex items-center justify-between gap-1">
					<p
						className="line-clamp-1 flex-1 overflow-hidden text-sm font-semibold"
						title={clipData.filename}
					>
						{vidTitle}
					</p>
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground text-xs font-medium">
							{clip.favorite_count}
						</span>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleFavorite}
							className="hover:bg-muted/50 h-6 w-6 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
						>
							<Heart
								className={`h-4 w-4 ${
									clip.isFavorited
										? "fill-red-500 text-red-500"
										: "text-muted-foreground hover:text-foreground"
								}`}
							/>
						</Button>
					</div>
					<ClipOptionsDropdown clip={clip} />
				</div>

				{/* Author & Time posted */}
				<div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
					<UserAvatar
						userId={message.author_id}
						username={author?.display_name}
						avatarUrl={author?.avatar_url ?? undefined}
						size="md"
						showName={true}
					/>
					<p className="text-muted-foreground text-xs">
						{formatRelativeTime(message.timestamp)}
					</p>
				</div>

				{/* Tags (Read Only) */}
				<div className="mb-1">
					<TagManager
						clipId={clipData.id}
						guildId={clipData.guild_id}
						currentTagSlugs={clip.tags || []}
						readOnly={true}
						maxTags={5}
						maxChars={50}
					/>
				</div>
			</div>

			{isExpired && (
				<div className="absolute top-2 right-2 rounded-full bg-red-500 p-[2px]"></div>
			)}
		</div>
	);
}
