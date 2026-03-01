"use client";

import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { useState } from "react";
import {
	ServerFilter,
	ChannelFilter,
	AuthorFilter,
	SortingFilter,
	ViewFilter,
	SearchFilter,
	ServerIcon,
} from "./";
import { MobileFilterMenu } from "../mobile-filtering";
import type { GuildWithStats } from "@/lib/api/guild";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { AuthorWithStats } from "@/lib/api/author";

type FilterMenuprops = {
	guildName: string;
	guildIcon: string | null;
	channelCount: number;
	authorCount: number;
	guilds: GuildWithStats[];
	guildsLoading: boolean;
	channels: ChannelWithStats[];
	channelsLoading: boolean;
	authors: AuthorWithStats[];
};

export function FilterMenu({
	guildName,
	guildIcon,
	channelCount,
	authorCount,
	guilds,
	guildsLoading,
	channels,
	channelsLoading,
	authors,
}: FilterMenuprops) {
	const { searchQuery } = useClipFiltersStore();
	const [isSearchOpen, setIsSearchOpen] = useState(!!searchQuery);

	if (isSearchOpen) {
		return <SearchFilter isOpen={true} onToggle={setIsSearchOpen} />;
	}

	return (
		<>
			<div className="hidden items-center gap-2 sm:flex">
				<ServerIcon guildIcon={guildIcon} guildName={guildName} />
				<ServerFilter guildName={guildName} guildIcon={guildIcon} />
				<ChannelFilter channelCount={channelCount} />
				<AuthorFilter authorCount={authorCount} />
				<SortingFilter />
				<ViewFilter />
				<SearchFilter isOpen={false} onToggle={setIsSearchOpen} />
			</div>
			<MobileFilterMenu
				guildName={guildName}
				guildIcon={guildIcon}
				guilds={guilds}
				guildsLoading={guildsLoading}
				channels={channels}
				channelsLoading={channelsLoading}
				authors={authors}
			/>
		</>
	);
}
