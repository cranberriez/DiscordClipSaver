"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { UserAvatar } from "@/components/core/UserAvatar";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { AuthorWithStats } from "@/lib/api/author";

interface AuthorSelectContentProps {
	authors: AuthorWithStats[];
	isLoading?: boolean;
}

export function AuthorSelectContent({
	authors,
	isLoading = false,
}: AuthorSelectContentProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const { selectedAuthorIds, selectedChannelIds, setAuthorIds } =
		useClipFiltersStore();

	const getAuthorClipCount = (author: AuthorWithStats): number => {
		if (!selectedChannelIds || selectedChannelIds.length === 0) {
			return author.clip_count || 0;
		}

		if (author.channel_clip_counts) {
			return selectedChannelIds.reduce((total, channelId) => {
				return total + (author.channel_clip_counts?.[channelId] || 0);
			}, 0);
		}

		return author.clip_count || 0;
	};

	const filteredAuthors = useMemo(() => {
		if (!searchQuery.trim()) return authors;
		const query = searchQuery.toLowerCase();
		return authors.filter(
			(author) =>
				author.display_name.toLowerCase().includes(query) ||
				author.user_id.toLowerCase().includes(query)
		);
	}, [authors, searchQuery]);

	const handleToggleAuthor = (authorId: string) => {
		if (selectedAuthorIds.includes(authorId)) {
			setAuthorIds(selectedAuthorIds.filter((id) => id !== authorId));
		} else {
			setAuthorIds([...selectedAuthorIds, authorId]);
		}
	};

	const handleSelectAll = () => {
		setAuthorIds(authors.map((a) => a.user_id));
	};

	const handleClearAll = () => {
		setAuthorIds([]);
	};

	const allSelected = selectedAuthorIds.length === authors.length;
	const noneSelected = selectedAuthorIds.length === 0;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="space-y-4 p-4 pb-2">
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search authors..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSelectAll}
						disabled={allSelected}
					>
						Select All
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearAll}
						disabled={noneSelected}
					>
						Clear All
					</Button>
					<span className="text-muted-foreground ml-auto text-sm">
						{selectedAuthorIds.length} of {authors.length} selected
					</span>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 pt-2">
				{isLoading ? (
					<div className="text-muted-foreground py-12 text-center">
						Loading authors...
					</div>
				) : filteredAuthors.length === 0 ? (
					<NoAuthorsFound searchQuery={searchQuery} />
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredAuthors.map((author) => {
							const isSelected = selectedAuthorIds.includes(
								author.user_id
							);

							return (
								<div
									key={author.user_id}
									className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
										isSelected
											? "bg-primary/10 border-primary"
											: "hover:bg-muted"
									}`}
									onClick={() => handleToggleAuthor(author.user_id)}
								>
									<div className="flex min-w-0 flex-1 items-center gap-2">
										<UserAvatar
											userId={author.user_id}
											username={author.display_name}
											avatarUrl={author.avatar_url ?? undefined}
											size="md"
										/>
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium">
												{author.display_name}
											</p>
											<p className="text-muted-foreground text-xs">
												{(() => {
													const count =
														getAuthorClipCount(author);
													return `${count} ${
														count === 1 ? "clip" : "clips"
													}`;
												})()}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function NoAuthorsFound({ searchQuery }: { searchQuery: string }) {
	if (searchQuery) {
		return (
			<div className="text-muted-foreground py-12 text-center">
				No authors match your search for &quot;
				<span className="font-medium">{searchQuery}</span>&quot;
			</div>
		);
	}

	return (
		<div className="text-muted-foreground py-12 text-center">
			<p>No authors found</p>
			<p>
				If you expect authors to be here, there may be an issue with the
				API.
			</p>
			<p>
				<Button variant="link" onClick={() => window.location.reload()}>
					Try again
				</Button>
			</p>
		</div>
	);
}
