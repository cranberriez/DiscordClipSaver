"use client";

import { Filter } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function ViewFilter() {
    const { favoritesOnly, setFavoritesOnly } = useClipFiltersStore();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                    <FilterNavButton>
                        <Filter className="h-5 w-5" />
                        Filter
                    </FilterNavButton>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="flex flex-col gap-1 px-2"
                align="start"
            >
                <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
