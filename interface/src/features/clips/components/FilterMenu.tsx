"use client";

import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../stores/useClipFiltersStore";
import { SortType, SortOrder } from "@/lib/api/clip";
import { ArrowDownUp, Server, Hash, User, Menu, X } from "lucide-react";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type FilterMenuprops = {
    guildName: string;
    guildIcon: string | null;
    channelCount: number;
    authorCount: number;
};

export function FilterMenu({
    guildName,
    guildIcon,
    channelCount,
    authorCount,
}: FilterMenuprops) {
    const {
        selectedGuildId,
        selectedChannelIds,
        selectedAuthorIds,
        searchQuery,
        sortType,
        sortOrder,
        openGuildModal,
        openChannelModal,
        openAuthorModal,
        setSearchQuery,
        setSortType,
        setSortOrder,
    } = useClipFiltersStore();

    const hasGuildSelected = !!selectedGuildId;

    const getChannelButtonText = () => {
        if (!hasGuildSelected) return "Channels";
        if (selectedChannelIds.length === 0) return "All Channels";
        if (selectedChannelIds.length === channelCount) return "All Channels";
        return `${selectedChannelIds.length} Channel${
            selectedChannelIds.length === 1 ? "" : "s"
        }`;
    };

    const getAuthorButtonText = () => {
        if (!hasGuildSelected) return "Authors";
        if (selectedAuthorIds.length === 0) return "All Authors";
        if (selectedAuthorIds.length === authorCount) return "All Authors";
        return `${selectedAuthorIds.length} Author${
            selectedAuthorIds.length === 1 ? "" : "s"
        }`;
    };

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
        <>
            <div className="hidden sm:flex items-center gap-2">
                {/* Guild Selector */}
                <FilterNavButton
                    onClick={openGuildModal}
                    className="w-64 px-2!"
                >
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                        {guildIcon ? (
                            <img
                                src={guildIcon}
                                alt={guildName || "Guild Icon"}
                                width={32}
                                height={32}
                            />
                        ) : (
                            <div className="flex items-center justify-center w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                                <Server className="w-8 h-8 text-background" />
                            </div>
                        )}
                    </div>
                    <p className="truncate text-muted-foreground group-hover:text-foreground transition-colors">
                        {guildName || "Select Server"}
                    </p>
                    <ArrowDownUp className="ml-auto w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </FilterNavButton>

                {/* Channel Selector */}
                <FilterNavButton onClick={openChannelModal}>
                    <Hash className="h-5 w-5" />
                    {getChannelButtonText()}
                </FilterNavButton>

                {/* Author Selector */}
                <FilterNavButton onClick={openAuthorModal}>
                    <User className="h-5 w-5" />
                    {getAuthorButtonText()}
                </FilterNavButton>

                {/* Order Selection */}
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
                        className="flex flex-col gap-1"
                        align="start"
                    >
                        <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
                            DATE
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => setSort("date", "desc")}
                            className={`${sortType === "date" && sortOrder === "desc" ? "bg-accent-foreground! text-accent!" : ""} cursor-pointer`}
                        >
                            Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSort("date", "asc")}
                            className={`${sortType === "date" && sortOrder === "asc" ? "bg-accent-foreground! text-accent!" : ""} cursor-pointer`}
                        >
                            Oldest First
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
                            DURATION
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => setSort("duration", "desc")}
                            className={`${sortType === "duration" && sortOrder === "desc" ? "bg-accent-foreground! text-accent!" : ""} cursor-pointer`}
                        >
                            Longest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSort("duration", "asc")}
                            className={`${sortType === "duration" && sortOrder === "asc" ? "bg-accent-foreground! text-accent!" : ""} cursor-pointer`}
                        >
                            Shortest First
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-foreground/50 tracking-wider">
                            SIZE
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => setSort("size", "desc")}
                            className={`${sortType === "size" && sortOrder === "desc" ? "bg-accent-foreground! text-accent!" : ""} cursor-pointer`}
                        >
                            Largest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSort("size", "asc")}
                            className={`${sortType === "size" && sortOrder === "asc" ? "bg-accent-foreground! text-accent!" : ""} cursor-pointer`}
                        >
                            Smallest First
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <MobileFilterMenu />
        </>
    );
}

export function MobileFilterMenu() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        console.log(isOpen);
        setIsOpen(prev => !prev);
    };

    return (
        <div className="sm:hidden flex items-center gap-2 p-1 bg-sidebar rounded-xl">
            <MenuButton onClick={toggleMenu} isOpen={isOpen} />
        </div>
    );
}

function MenuButton({
    onClick,
    isOpen,
}: {
    onClick: () => void;
    isOpen: boolean;
}) {
    return (
        <button
            onClick={onClick}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            className="relative w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg hover:bg-background/50"
        >
            <X
                className={`absolute opacity-${isOpen ? 100 : 0} transition-opacity`}
                size={32}
            />
            <Menu
                className={`absolute opacity-${isOpen ? 0 : 100} transition-opacity`}
                size={32}
            />
        </button>
    );
}
