import { FilterMenu } from "./FilterMenu";
import { NavbarCompact } from "@/components/composite/navbarCompact";

interface FilterBarProps {
    guildName?: string;
    guildIcon?: string | null;
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
    guildIcon,
    channelCount = 0,
    authorCount = 0,
}: FilterBarProps) {
    return (
        <div className="container mx-auto px-3 sm:px-8 max-w-full absolute top-0 z-10">
            <div className="flex items-center justify-between gap-2 px-1 py-2 rounded-b-xl bg-background/80 backdrop-blur-sm">
                <FilterMenu
                    guildName={guildName || ""}
                    guildIcon={guildIcon || null}
                    channelCount={channelCount}
                    authorCount={authorCount}
                />
                <NavbarCompact />
            </div>
        </div>
    );
}
