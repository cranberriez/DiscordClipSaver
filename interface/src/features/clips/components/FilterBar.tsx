import { FilterMenu } from "./clip-filtering/FilterMenu";
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
		<div className="bg-popover absolute top-0 z-10 container mx-auto max-w-full px-3 sm:px-8">
			<div className="flex items-center justify-between gap-2 py-2">
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
