"use client";

import { Filter, Tag } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ViewFilter() {
	const {
		favoritesOnly,
		setFavoritesOnly,
		openTagModal,
		tagsAny,
		tagsAll,
		tagsExclude,
	} = useClipFiltersStore();

	const hasActiveTagFilters =
		tagsAny.length > 0 || tagsAll.length > 0 || tagsExclude.length > 0;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<div>
					<FilterNavButton
						activeState={!!favoritesOnly || hasActiveTagFilters}
					>
						<Filter className="h-5 w-5" />
						<span>Filter</span>
					</FilterNavButton>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="flex flex-col gap-1 px-2"
				align="start"
			>
				<DropdownMenuLabel className="text-foreground/50 text-xs tracking-wider">
					VIEW
				</DropdownMenuLabel>
				<DropdownMenuItem
					onClick={() => setFavoritesOnly(!favoritesOnly)}
					className={`${
						favoritesOnly
							? "bg-accent-foreground! text-accent!"
							: ""
					} cursor-pointer`}
				>
					Favorites Only
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuLabel className="text-foreground/50 text-xs tracking-wider">
					TAGS
				</DropdownMenuLabel>
				<DropdownMenuItem
					onClick={openTagModal}
					className={`${
						hasActiveTagFilters
							? "bg-accent-foreground! text-accent!"
							: ""
					} flex cursor-pointer items-center gap-2`}
				>
					<Tag className="h-4 w-4" />
					Filter by Tags
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
