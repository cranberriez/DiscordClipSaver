"use client";

import { useEffect } from "react";
import { ArrowDownUp, ChevronDown, Heart, Search } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { getSortLabel } from "../../lib/filtering";
import { ServerSwitcher } from "./ServerSwitcher";
import { FilterTokenStrip } from "./FilterTokenStrip";
import { NavbarCompact } from "@/components/composite/navbarCompact";
import { cn } from "@/lib/utils";
import type { GuildWithStats } from "@/lib/api/guild";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { AuthorWithStats } from "@/lib/api/author";

interface ClipCommandBarProps {
	guilds: GuildWithStats[];
	guildsLoading: boolean;
	selectedGuild?: { name: string; icon_url: string | null } | null;
	channels: ChannelWithStats[];
	authors: AuthorWithStats[];
	/** Total clips in the guild (for the search placeholder) */
	totalClipCount?: number;
	/** Clips matching current filters (shown in the token strip) */
	resultCount?: number;
}

/** Small mode button inside the search trigger ("#", "@", "◆"). */
function ModeButton({
	label,
	title,
	seed,
	colorClass,
}: {
	label: string;
	title: string;
	seed: string;
	/** Token-coordinated text color (e.g. "text-indigo-300") */
	colorClass: string;
}) {
	const { openPalette } = useClipFiltersStore();
	return (
		<button
			type="button"
			title={title}
			aria-label={title}
			onClick={(e) => {
				e.stopPropagation();
				openPalette(seed);
			}}
			className={cn(
				"hover:bg-accent flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full font-mono text-sm font-bold transition-colors hover:brightness-125",
				colorClass
			)}
		>
			{label}
		</button>
	);
}

/**
 * Floating glass command bar for the clips page: server switcher, palette
 * search trigger, sort, favorites, and compact navigation. The token strip
 * renders inside the same sticky wrapper so it follows the bar on scroll.
 */
export function ClipCommandBar({
	guilds,
	guildsLoading,
	selectedGuild,
	channels,
	authors,
	totalClipCount,
	resultCount,
}: ClipCommandBarProps) {
	const {
		searchQuery,
		sortType,
		sortOrder,
		favoritesOnly,
		setFavoritesOnly,
		openPalette,
	} = useClipFiltersStore();

	// Global Ctrl/Cmd+K shortcut
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				openPalette();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [openPalette]);

	const trimmedQuery = searchQuery.trim();
	const placeholder =
		totalClipCount != null
			? `Search ${totalClipCount.toLocaleString()} clips...`
			: "Search clips...";

	return (
		<div className="absolute inset-x-0 top-0 z-40 px-3 pt-2 sm:px-6">
			<div className="border-border/25 bg-sidebar/50 flex items-center gap-2 rounded-full border p-1.5 shadow-lg backdrop-blur-sm">
				<ServerSwitcher
					guilds={guilds}
					isLoading={guildsLoading}
					selectedGuild={selectedGuild}
				/>

				{/* Search trigger — opens the command palette */}
				<div
					role="button"
					tabIndex={0}
					onClick={() => openPalette()}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							openPalette();
						}
					}}
					className="border-border bg-popover/80 hover:border-border focus-visible:ring-ring flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border pr-1.5 pl-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
				>
					<Search className="text-muted-foreground h-4 w-4 flex-none" />
					<span
						className={cn(
							"min-w-0 flex-1 truncate text-sm",
							trimmedQuery
								? "text-foreground"
								: "text-muted-foreground"
						)}
					>
						{trimmedQuery || placeholder}
					</span>
					<span className="hidden items-center md:flex">
						<ModeButton
							label="#"
							title="Filter by channel"
							seed="c:"
							colorClass="text-indigo-300"
						/>
						<ModeButton
							label="@"
							title="Filter by author"
							seed="a:"
							colorClass="text-emerald-300"
						/>
						<ModeButton
							label="◆"
							title="Filter by tag"
							seed="t:"
							colorClass="text-amber-300"
						/>
					</span>
					<kbd className="border-border bg-sidebar text-muted-foreground hidden flex-none rounded-md border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
						Ctrl K
					</kbd>
				</div>

				{/* Sort — opens the palette in sort mode */}
				<button
					type="button"
					onClick={() => openPalette("sort:")}
					className="border-border bg-popover hover:bg-popover-hover text-muted-foreground hover:text-foreground hidden h-9 flex-none cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors sm:flex"
					title="Sort order"
				>
					<ArrowDownUp className="h-3.5 w-3.5" />
					{getSortLabel(sortType, sortOrder)}
					<ChevronDown className="h-3 w-3 opacity-50" />
				</button>

				{/* Favorites toggle */}
				<button
					type="button"
					onClick={() => setFavoritesOnly(!favoritesOnly)}
					className={cn(
						"hover:bg-accent flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full transition-colors",
						favoritesOnly
							? "text-rose-500"
							: "text-muted-foreground hover:text-foreground"
					)}
					title={
						favoritesOnly
							? "Showing favorites only"
							: "Show favorites only"
					}
					aria-pressed={favoritesOnly}
				>
					<Heart
						className={cn(
							"h-4 w-4",
							favoritesOnly && "fill-current"
						)}
					/>
				</button>

				<div className="bg-border h-5 w-px flex-none" />

				<NavbarCompact />
			</div>

			<FilterTokenStrip
				channels={channels}
				authors={authors}
				resultCount={resultCount}
			/>
		</div>
	);
}
