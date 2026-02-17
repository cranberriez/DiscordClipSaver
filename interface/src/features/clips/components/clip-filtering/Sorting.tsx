"use client";

import { ArrowDownUp } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { SortType, SortOrder } from "@/lib/api/clip";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function SortingFilter() {
    const { sortType, sortOrder, setSortType, setSortOrder } =
        useClipFiltersStore();

    const setSort = (type: SortType, order: SortOrder) => {
        setSortType(type);
        setSortOrder(order);
    };

    const getSortText = (type: SortType, order: SortOrder) => {
        const text: Record<string, Record<string, string>> = {
            date: {
                asc: "Oldest First",
                desc: "Newest First",
            },
            duration: {
                asc: "Shortest First",
                desc: "Longest First",
            },
            size: {
                asc: "Smallest First",
                desc: "Largest First",
            },
        };
        return text[type]?.[order] || "Sort";
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                    <FilterNavButton>
                        <ArrowDownUp className="h-5 w-5" />
                        {getSortText(sortType, sortOrder)}
                    </FilterNavButton>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="flex flex-col gap-1 px-2"
                align="start"
            >
                <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
                    DATE
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => setSort("date", "desc")}
                    className={`${
                        sortType === "date" && sortOrder === "desc"
                            ? "bg-accent-foreground! text-accent!"
                            : ""
                    } cursor-pointer`}
                >
                    Newest First
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setSort("date", "asc")}
                    className={`${
                        sortType === "date" && sortOrder === "asc"
                            ? "bg-accent-foreground! text-accent!"
                            : ""
                    } cursor-pointer`}
                >
                    Oldest First
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
                    DURATION
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => setSort("duration", "desc")}
                    className={`${
                        sortType === "duration" && sortOrder === "desc"
                            ? "bg-accent-foreground! text-accent!"
                            : ""
                    } cursor-pointer`}
                >
                    Longest First
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setSort("duration", "asc")}
                    className={`${
                        sortType === "duration" && sortOrder === "asc"
                            ? "bg-accent-foreground! text-accent!"
                            : ""
                    } cursor-pointer`}
                >
                    Shortest First
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
                    LIKES
                </DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => setSort("likes", "desc")}
                    className={`${
                        sortType === "likes" && sortOrder === "desc"
                            ? "bg-accent-foreground! text-accent!"
                            : ""
                    } cursor-pointer`}
                >
                    Most Liked
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
