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
	const lastSyncedQueryRef = useRef<string>(searchQuery);
	const normalizedDebouncedValue = debouncedSearchValue.trim();

	// Sync debounced value to store
	useEffect(() => {
		if (normalizedDebouncedValue === lastSyncedQueryRef.current) return;
		lastSyncedQueryRef.current = normalizedDebouncedValue;
		setSearchQuery(normalizedDebouncedValue);
	}, [normalizedDebouncedValue, setSearchQuery]);

	// If store value changes externally (URL hydration, reset, etc), sync input
	useEffect(() => {
		lastSyncedQueryRef.current = searchQuery;
		setSearchValue(searchQuery);
	}, [searchQuery]);

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
			<div className="animate-in fade-in slide-in-from-left-2 hidden flex-1 items-center gap-2 duration-200 sm:flex">
				<div className="relative flex-1">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						ref={inputRef}
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
						placeholder="Search by title, filename, author, or content..."
						className="bg-sidebar border-sidebar h-10 border-2 pr-8 pl-9"
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.preventDefault();
								e.stopPropagation();
								handleCloseSearch();
							}
						}}
					/>
					{searchValue && (
						<Button
							variant="destructive"
							size="sm"
							className="text-foreground hover:text-foreground right-1rounded! absolute top-1/2"
							onClick={handleClearSearch}
						>
							<span>Clear</span>
							<span className="sr-only">Clear search</span>
						</Button>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0 cursor-pointer"
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
			<span>Search</span>
		</FilterNavButton>
	);
}
