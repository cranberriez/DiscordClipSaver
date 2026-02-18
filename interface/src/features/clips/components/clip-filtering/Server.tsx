"use client";

import { ArrowDownUp } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";

type ServerProps = {
    guildName: string;
    guildIcon: string | null;
};

export function ServerFilter({ guildName }: ServerProps) {
    const { openGuildModal } = useClipFiltersStore();

    return (
        <FilterNavButton onClick={openGuildModal} className="w-48">
            <p className="truncate text-muted-foreground group-hover:text-foreground transition-colors">
                {guildName || "Select Server"}
            </p>
            <ArrowDownUp className="ml-auto w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </FilterNavButton>
    );
}
