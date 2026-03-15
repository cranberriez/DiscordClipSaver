import { Archive, LinkIcon, Lock } from "lucide-react";

export function ClipCardBadges({
	isArchived,
	visibility,
	isNSFW,
}: {
	isArchived: boolean;
	visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
	isNSFW: boolean;
}) {
	return (
		<div className="absolute top-2 left-2 flex gap-2">
			{/* Visibility & Archive Badges */}
			{isArchived ? (
				<div className="pointer-events-none flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white backdrop-blur-sm">
					<Archive className="h-3 w-3" />
					<span className="font-medium">Archived</span>
				</div>
			) : visibility === "PRIVATE" ? (
				<div className="pointer-events-none flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white backdrop-blur-sm">
					<Lock className="h-3 w-3" />
					<span className="font-medium">Private</span>
				</div>
			) : visibility === "UNLISTED" ? (
				<div className="pointer-events-none flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white backdrop-blur-sm">
					<LinkIcon className="h-3 w-3" />
					<span className="font-medium">Unlisted</span>
				</div>
			) : null}

			{/* NSFW Badge */}
			{isNSFW && (
				<div className="pointer-events-none gap-1 rounded bg-red-500/25 px-2 py-1 text-xs font-semibold text-red-400 backdrop-blur-lg">
					<span>NSFW</span>
				</div>
			)}
		</div>
	);
}
