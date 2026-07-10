"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useGuildTags } from "@/lib/queries/tags";
import { FilterToken } from "./FilterToken";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { AuthorWithStats } from "@/lib/api/author";

interface FilterTokenStripProps {
	channels: ChannelWithStats[];
	authors: AuthorWithStats[];
	/** Number of clips matching the current filters, when known */
	resultCount?: number;
}

/**
 * Row of removable tokens for every active filter. Rendered inside the same
 * sticky wrapper as the command bar so it follows the nav while scrolling.
 * Renders nothing when no filters are active.
 */
export function FilterTokenStrip({
	channels,
	authors,
	resultCount,
}: FilterTokenStripProps) {
	const {
		selectedGuildId,
		selectedChannelIds,
		selectedAuthorIds,
		tagsAny,
		tagsAll,
		tagsExclude,
		searchQuery,
		favoritesOnly,
		setChannelIds,
		setAuthorIds,
		setTagsAny,
		setTagsAll,
		setTagsExclude,
		setSearchQuery,
		setFavoritesOnly,
		clearFilters,
	} = useClipFiltersStore();

	const { data: tags = [] } = useGuildTags(selectedGuildId || "");

	const channelNames = useMemo(
		() => new Map(channels.map((c) => [c.id, c.name])),
		[channels]
	);
	const authorNames = useMemo(
		() => new Map(authors.map((a) => [a.user_id, a.display_name])),
		[authors]
	);
	const tagNames = useMemo(
		() => new Map(tags.map((t) => [t.slug, t.name])),
		[tags]
	);

	const hasFilters =
		selectedChannelIds.length > 0 ||
		selectedAuthorIds.length > 0 ||
		tagsAny.length > 0 ||
		tagsAll.length > 0 ||
		tagsExclude.length > 0 ||
		!!searchQuery.trim() ||
		favoritesOnly;

	if (!hasFilters) return null;

	const removeFrom =
		(list: string[], setter: (v: string[]) => void, value: string) => () =>
			setter(list.filter((v) => v !== value));

	return (
		<div className="mt-2 flex flex-wrap items-center gap-1.5">
			<button
				type="button"
				onClick={clearFilters}
				className="border-border/35 bg-sidebar/55 text-rose-400 hover:border-border/55 hover:bg-accent/70 focus-visible:ring-ring inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-colors focus-visible:ring-2 focus-visible:outline-none active:translate-y-px"
				aria-label="Clear all filters"
				title="Clear all filters"
			>
				<Trash2 className="h-3.5 w-3.5" />
			</button>
			{resultCount != null && (
				<span className="text-muted-foreground mr-1 text-xs font-medium whitespace-nowrap">
					{resultCount.toLocaleString()} clip
					{resultCount === 1 ? "" : "s"}
				</span>
			)}
			{searchQuery.trim() && (
				<FilterToken
					variant="search"
					label={searchQuery.trim()}
					onRemove={() => setSearchQuery("")}
				/>
			)}
			{selectedChannelIds.map((id) => (
				<FilterToken
					key={`ch-${id}`}
					variant="channel"
					label={channelNames.get(id) ?? id}
					onRemove={removeFrom(
						selectedChannelIds,
						setChannelIds,
						id
					)}
				/>
			))}
			{selectedAuthorIds.map((id) => (
				<FilterToken
					key={`au-${id}`}
					variant="author"
					label={authorNames.get(id) ?? id}
					onRemove={removeFrom(selectedAuthorIds, setAuthorIds, id)}
				/>
			))}
			{tagsAny.map((slug) => (
				<FilterToken
					key={`tany-${slug}`}
					variant="tag"
					label={tagNames.get(slug) ?? slug}
					onRemove={removeFrom(tagsAny, setTagsAny, slug)}
				/>
			))}
			{tagsAll.map((slug) => (
				<FilterToken
					key={`tall-${slug}`}
					variant="tag"
					label={`all: ${tagNames.get(slug) ?? slug}`}
					onRemove={removeFrom(tagsAll, setTagsAll, slug)}
				/>
			))}
			{tagsExclude.map((slug) => (
				<FilterToken
					key={`tex-${slug}`}
					variant="tag"
					label={`not: ${tagNames.get(slug) ?? slug}`}
					onRemove={removeFrom(tagsExclude, setTagsExclude, slug)}
				/>
			))}
			{favoritesOnly && (
				<FilterToken
					variant="favorite"
					label="Favorites"
					onRemove={() => setFavoritesOnly(false)}
				/>
			)}
		</div>
	);
}
