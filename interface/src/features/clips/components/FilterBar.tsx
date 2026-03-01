import { FilterMenu } from "./clip-filtering/FilterMenu";
import { NavbarCompact } from "@/components/composite/navbarCompact";
import type { GuildWithStats } from "@/lib/api/guild";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { AuthorWithStats } from "@/lib/api/author";

interface FilterBarProps {
	guildName?: string;
	guildIcon?: string | null;
	channelCount?: number;
	authorCount?: number;
	guilds: GuildWithStats[];
	guildsLoading: boolean;
	channels: ChannelWithStats[];
	channelsLoading: boolean;
	authors: AuthorWithStats[];
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
	guilds,
	guildsLoading,
	channels,
	channelsLoading,
	authors,
}: FilterBarProps) {
	return (
		<div className="bg-popover absolute top-0 z-10 container mx-auto max-w-full px-3 sm:px-8">
			<div className="flex items-center justify-between gap-2 py-2">
				<FilterMenu
					guildName={guildName || ""}
					guildIcon={guildIcon || null}
					channelCount={channelCount}
					authorCount={authorCount}
					guilds={guilds}
					guildsLoading={guildsLoading}
					channels={channels}
					channelsLoading={channelsLoading}
					authors={authors}
				/>
				<NavbarCompact />
			</div>
		</div>
	);
}
