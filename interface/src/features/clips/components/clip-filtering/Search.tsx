"use client";

import { Search, X } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useDebounce } from "@/lib/hooks";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchProps = {
    isOpen: boolean;
    onToggle: (open: boolean) => void;
};

export function SearchFilter({ isOpen, onToggle }: SearchProps) {
    const { searchQuery, setSearchQuery } = useClipFiltersStore();
    const [searchValue, setSearchValue] = useState(searchQuery);
    const debouncedSearchValue = useDebounce(searchValue, 500);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync debounced value to store
    useEffect(() => {
        setSearchQuery(debouncedSearchValue);
    }, [debouncedSearchValue, setSearchQuery]);

    // Auto-focus input when search opens
    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure element is mounted
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleCloseSearch = () => {
        onToggle(false);
    };

    const handleClearSearch = () => {
        setSearchValue("");
        setSearchQuery("");
        inputRef.current?.focus();
    };

    if (isOpen) {
        return (
            <div className="hidden sm:flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        placeholder="Search by title, filename, author, or content..."
                        className="pl-9 pr-8 h-10 bg-sidebar border-2 border-sidebar"
                        onKeyDown={e => {
                            if (e.key === "Escape") {
                                handleCloseSearch();
                            }
                        }}
                    />
                    {searchValue && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={handleClearSearch}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Clear search</span>
                        </Button>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={handleCloseSearch}
                >
                    <X className="h-8 w-8" />
                    <span className="sr-only">Close search</span>
                </Button>
            </div>
        );
    }

    return (
        <FilterNavButton onClick={() => onToggle(true)}>
            <Search className="h-5 w-5" />
            Search
        </FilterNavButton>
    );
}
