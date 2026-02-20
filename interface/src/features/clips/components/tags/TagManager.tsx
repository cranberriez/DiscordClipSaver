"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
	useGuildTags,
	useAddClipTags,
	useRemoveClipTags,
} from "@/lib/queries/tags";
import { TagBadge } from "./TagBadge";
import type { Tag } from "@/lib/api/clip";

interface TagManagerProps {
	clipId: string;
	guildId: string;
	currentTagSlugs: string[];
	readOnly?: boolean;
	maxTags?: number;
	maxChars?: number;
}

const DEFAULT_MAX_TAGS = 10;
const DEFAULT_MAX_CHARS = 100;

export function TagManager({
	clipId,
	guildId,
	currentTagSlugs,
	readOnly = false,
	maxTags = DEFAULT_MAX_TAGS,
	maxChars = DEFAULT_MAX_CHARS,
}: TagManagerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Queries
	const { data: guildTags, isLoading: isLoadingTags } = useGuildTags(guildId);

	// Mutations
	const addTags = useAddClipTags();
	const removeTags = useRemoveClipTags();

	// Derived state
	const resolvedTags = useMemo(() => {
		if (!guildTags) return [];
		return currentTagSlugs
			.map((slug) => guildTags.find((t) => t.slug === slug))
			.filter((t): t is Tag => !!t);
	}, [guildTags, currentTagSlugs]);

	const { visibleTags, hiddenTags } = useMemo(() => {
		if (resolvedTags.length === 0)
			return { visibleTags: [], hiddenTags: [] };

		const visible: Tag[] = [];
		const hidden: Tag[] = [];
		let charCount = 0;

		for (const tag of resolvedTags) {
			const tagLen = tag.name.length;
			// Always show at least one tag if it exists
			if (
				visible.length === 0 ||
				(visible.length < maxTags && charCount + tagLen <= maxChars)
			) {
				visible.push(tag);
				charCount += tagLen;
			} else {
				hidden.push(tag);
			}
		}
		return { visibleTags: visible, hiddenTags: hidden };
	}, [resolvedTags, maxTags, maxChars]);

	const filteredAvailableTags = useMemo(() => {
		if (!guildTags) return [];
		const lowerQuery = searchQuery.toLowerCase();

		return guildTags
			.filter((tag) => {
				const matchesSearch = tag.name
					.toLowerCase()
					.includes(lowerQuery);
				return matchesSearch;
			})
			.sort((a, b) => a.slug.localeCompare(b.slug));
	}, [guildTags, searchQuery]);

	// Handlers
	const handleAddTag = (tag: Tag) => {
		addTags.mutate({ clipId, tags: [tag] });
		// Don't close popover to allow adding multiple
	};

	const handleRemoveTag = (tag: Tag) => {
		removeTags.mutate({ clipId, tags: [tag] });
	};

	if (readOnly && resolvedTags.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Visible Tags */}
			{visibleTags.map((tag) => (
				<TagBadge
					key={tag.id}
					tag={tag}
					onRemove={
						!readOnly ? () => handleRemoveTag(tag) : undefined
					}
				/>
			))}

			{/* Hidden Tags Popover */}
			{hiddenTags.length > 0 && (
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground border-muted-foreground/30 hover:border-muted-foreground/60 h-6 rounded-full border border-dashed px-2 text-xs"
						>
							+{hiddenTags.length} more
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64 p-2">
						<div className="flex flex-wrap gap-2">
							{hiddenTags.map((tag) => (
								<TagBadge
									key={tag.id}
									tag={tag}
									onRemove={
										!readOnly
											? () => handleRemoveTag(tag)
											: undefined
									}
								/>
							))}
						</div>
					</PopoverContent>
				</Popover>
			)}

			{/* Add Tag Button */}
			{!readOnly && (
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground border-muted-foreground/30 hover:border-muted-foreground/60 h-6 rounded-full border border-dashed px-2 text-xs"
						>
							<Plus className="mr-1 h-3 w-3" />
							Add Tag
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64 p-0" align="start">
						<div className="border-b p-2">
							<div className="focus-within:ring-ring flex items-center px-2 py-1 focus-within:ring-1">
								<Search className="text-muted-foreground mr-2 h-4 w-4" />
								<Input
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									placeholder="Search tags..."
									className="h-6 border-0 bg-transparent! p-0 text-sm focus-visible:ring-0"
									autoFocus
									maxLength={64}
								/>
							</div>
						</div>

						<div className="max-h-[300px] overflow-y-auto p-1">
							{isLoadingTags ? (
								<div className="text-muted-foreground flex items-center justify-center p-4">
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									<span className="text-xs">
										Loading tags...
									</span>
								</div>
							) : (
								<>
									{filteredAvailableTags.length === 0 &&
										!searchQuery && (
											<div className="text-muted-foreground p-2 text-center text-xs">
												No available tags
											</div>
										)}

									{filteredAvailableTags.length === 0 &&
										searchQuery && (
											<div className="text-muted-foreground p-2 text-center text-xs">
												No tags found
											</div>
										)}

									{filteredAvailableTags.map((tag) => {
										const isSelected =
											currentTagSlugs.includes(tag.slug);
										return (
											<button
												key={tag.id}
												onClick={() =>
													isSelected
														? handleRemoveTag(tag)
														: handleAddTag(tag)
												}
												className="hover:bg-accent hover:text-accent-foreground group flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm"
											>
												<div className="flex items-center overflow-hidden">
													<div
														className="mr-2 h-2 w-2 flex-shrink-0 rounded-full"
														style={{
															backgroundColor:
																tag.color ||
																"gray",
														}}
													/>
													<span className="truncate">
														{tag.name}
													</span>
												</div>
												{isSelected && (
													<Check className="ml-2 h-3 w-3 opacity-50" />
												)}
											</button>
										);
									})}
								</>
							)}
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
