"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { AuthorWithStats } from "@/lib/api/author";

interface AuthorSelectModalProps {
    authors: AuthorWithStats[];
    isLoading?: boolean;
}

export function AuthorSelectModal({
    authors,
    isLoading = false,
}: AuthorSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const {
        isAuthorModalOpen,
        closeAuthorModal,
        selectedAuthorIds,
        setAuthorIds,
    } = useClipFiltersStore();

    // Filter authors by search query
    const filteredAuthors = useMemo(() => {
        if (!searchQuery.trim()) return authors;
        const query = searchQuery.toLowerCase();
        return authors.filter(
            author =>
                author.display_name.toLowerCase().includes(query) ||
                author.user_id.toLowerCase().includes(query)
        );
    }, [authors, searchQuery]);

    const handleToggleAuthor = (authorId: string) => {
        if (selectedAuthorIds.includes(authorId)) {
            setAuthorIds(selectedAuthorIds.filter(id => id !== authorId));
        } else {
            setAuthorIds([...selectedAuthorIds, authorId]);
        }
    };

    const handleSelectAll = () => {
        setAuthorIds(authors.map(a => a.user_id));
    };

    const handleClearAll = () => {
        setAuthorIds([]);
    };

    const allSelected = selectedAuthorIds.length === authors.length;
    const noneSelected = selectedAuthorIds.length === 0;

    return (
        <Dialog open={isAuthorModalOpen} onOpenChange={closeAuthorModal}>
            <DialogContent className="sm:!max-w-6xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Authors</DialogTitle>
                </DialogHeader>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search authors..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Bulk actions */}
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
                    <span className="text-sm text-muted-foreground ml-auto">
                        {selectedAuthorIds.length} of {authors.length} selected
                    </span>
                </div>

                {/* Author grid */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading authors...
                        </div>
                    ) : filteredAuthors.length === 0 ? (
                        <NoAuthorsFound searchQuery={searchQuery} />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredAuthors.map(author => {
                                const isSelected = selectedAuthorIds.includes(
                                    author.user_id
                                );

                                return (
                                    <div
                                        key={author.user_id}
                                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-primary/10 border-primary"
                                                : "hover:bg-muted"
                                        }`}
                                        onClick={() =>
                                            handleToggleAuthor(author.user_id)
                                        }
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                                handleToggleAuthor(
                                                    author.user_id
                                                )
                                            }
                                            onClick={(e: React.MouseEvent) =>
                                                e.stopPropagation()
                                            }
                                        />

                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <UserAvatar
                                                userId={author.user_id}
                                                username={author.display_name}
                                                avatarUrl={
                                                    author.avatar_url ??
                                                    undefined
                                                }
                                                size="md"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {author.display_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {author.clip_count}{" "}
                                                    {author.clip_count === 1
                                                        ? "clip"
                                                        : "clips"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4">
                    <Button onClick={closeAuthorModal}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function NoAuthorsFound({ searchQuery }: { searchQuery: string }) {
    if (searchQuery) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No authors match your search for &quot;
                <span className="font-medium">{searchQuery}</span>&quot;
            </div>
        );
    }

    return (
        <div className="text-center py-12 text-muted-foreground">
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
