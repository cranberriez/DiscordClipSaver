"use client";

import { useMemo } from "react";
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
		<div className="border-border/25 bg-sidebar/50 mt-2 flex flex-wrap items-center gap-1.5 rounded-2xl border px-3 py-1.5 backdrop-blur-sm">
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
			<button
				type="button"
				onClick={clearFilters}
				className="text-primary/90 ml-1 cursor-pointer text-xs font-medium whitespace-nowrap hover:underline"
			>
				Clear all
			</button>
		</div>
	);
}
