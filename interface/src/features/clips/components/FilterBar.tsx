"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Server, Hash, User, Search, ArrowUpDown } from "lucide-react";
import { useClipFiltersStore, type SortOrder } from "../stores/useClipFiltersStore";

interface FilterBarProps {
    guildName?: string;
    channelCount?: number;
    authorCount?: number;
}

/**
 * FilterBar component - Sticky filter bar at the top of the clips page
 * 
 * Features:
 * - Guild selection button
 * - Channel selection button (disabled if no guild selected)
 * - Author selection button (disabled if no guild selected)
 * - Search input
 * - Sort order toggle
 */
export function FilterBar({
    guildName,
    channelCount = 0,
    authorCount = 0,
}: FilterBarProps) {
    const {
        selectedGuildId,
        selectedChannelIds,
        selectedAuthorIds,
        searchQuery,
        sortOrder,
        openGuildModal,
        openChannelModal,
        openAuthorModal,
        setSearchQuery,
        setSortOrder,
    } = useClipFiltersStore();

    const hasGuildSelected = !!selectedGuildId;

    const getChannelButtonText = () => {
        if (!hasGuildSelected) return "Channels";
        if (selectedChannelIds.length === 0) return "All Channels";
        if (selectedChannelIds.length === channelCount) return "All Channels";
        return `${selectedChannelIds.length} Channel${selectedChannelIds.length === 1 ? "" : "s"}`;
    };

    const getAuthorButtonText = () => {
        if (!hasGuildSelected) return "Authors";
        if (selectedAuthorIds.length === 0) return "All Authors";
        if (selectedAuthorIds.length === authorCount) return "All Authors";
        return `${selectedAuthorIds.length} Author${selectedAuthorIds.length === 1 ? "" : "s"}`;
    };

    return (
        <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <div className="flex flex-col gap-4">
                    {/* Top row: Filter buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Guild selector */}
                        <Button
                            variant="outline"
                            onClick={openGuildModal}
                            className="gap-2"
                        >
                            <Server className="h-4 w-4" />
                            {guildName || "Select Server"}
                        </Button>

                        {/* Channel selector */}
                        <Button
                            variant="outline"
                            onClick={openChannelModal}
                            disabled={!hasGuildSelected}
                            className="gap-2"
                        >
                            <Hash className="h-4 w-4" />
                            {getChannelButtonText()}
                        </Button>

                        {/* Author selector */}
                        <Button
                            variant="outline"
                            onClick={openAuthorModal}
                            disabled={!hasGuildSelected}
                            className="gap-2"
                        >
                            <User className="h-4 w-4" />
                            {getAuthorButtonText()}
                        </Button>

                        {/* Sort order */}
                        <Select
                            value={sortOrder}
                            onValueChange={(value) =>
                                setSortOrder(value as SortOrder)
                            }
                            disabled={!hasGuildSelected}
                        >
                            <SelectTrigger className="w-[180px]">
                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="h-4 w-4" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="desc">
                                    Newest First
                                </SelectItem>
                                <SelectItem value="asc">Oldest First</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bottom row: Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search clips by filename or message content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={!hasGuildSelected}
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
