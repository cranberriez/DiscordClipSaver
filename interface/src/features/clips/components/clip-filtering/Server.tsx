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
			<p className="text-muted-foreground group-hover:text-foreground truncate transition-colors">
				{guildName || "Select Server"}
			</p>
			<ArrowDownUp className="text-muted-foreground ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
		</FilterNavButton>
	);
}
