"use client";

import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useState, useEffect } from "react";
import {
    ServerFilter,
    ChannelFilter,
    AuthorFilter,
    SortingFilter,
    ViewFilter,
    SearchFilter,
    ServerIcon,
} from "./";
import { MobileFilterMenu } from "./MobileFilterMenu";

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
    const { searchQuery } = useClipFiltersStore();
    const [isSearchOpen, setIsSearchOpen] = useState(!!searchQuery);

    // Keep search open if there is a query (e.g. on initial load)
    useEffect(() => {
        if (searchQuery && !isSearchOpen) {
            setIsSearchOpen(true);
        }
    }, [searchQuery, isSearchOpen]);

    if (isSearchOpen) {
        return <SearchFilter isOpen={true} onToggle={setIsSearchOpen} />;
    }

    return (
        <>
            <div className="hidden sm:flex items-center gap-2">
                <ServerIcon guildIcon={guildIcon} guildName={guildName} />
                <ServerFilter guildName={guildName} guildIcon={guildIcon} />
                <ChannelFilter channelCount={channelCount} />
                <AuthorFilter authorCount={authorCount} />
                <SortingFilter />
                <ViewFilter />
                <SearchFilter isOpen={false} onToggle={setIsSearchOpen} />
            </div>
            <MobileFilterMenu />
        </>
    );
}
