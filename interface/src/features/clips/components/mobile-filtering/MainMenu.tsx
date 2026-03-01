import Image from "next/image";
import {
	Server,
	Hash,
	Users,
	Tag as TagIcon,
	ArrowDownUp,
	Filter,
	Search,
	ChevronRight,
} from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { MenuView } from "./types";

export function MainMenu({
	onViewChange,
	guildIcon,
	guildName,
}: {
	onViewChange: (view: MenuView) => void;
	guildIcon?: string | null;
	guildName?: string;
}) {
	const {
		selectedGuildId,
		selectedChannelIds,
		selectedAuthorIds,
		tagsAny,
		tagsAll,
		tagsExclude,
		sortType,
		sortOrder,
		favoritesOnly,
		searchQuery,
	} = useClipFiltersStore();

	const hasTagsFilter =
		tagsAny.length > 0 || tagsAll.length > 0 || tagsExclude.length > 0;

	const mainMenuItems = [
		{
			id: "server",
			label: guildName || "Server",
			icon: guildIcon ? undefined : Server,
			image: guildIcon,
			isActive: !!selectedGuildId,
		},
		{
			id: "channel",
			label: "Channel",
			icon: Hash,
			isActive: selectedChannelIds.length > 0,
		},
		{
			id: "author",
			label: "Author",
			icon: Users,
			isActive: selectedAuthorIds.length > 0,
		},
		{
			id: "tag",
			label: "Tag",
			icon: TagIcon,
			isActive: hasTagsFilter,
			disabled: !selectedGuildId,
		},
		{
			id: "sort",
			label: "Sort",
			icon: ArrowDownUp,
			isActive: !(sortType === "date" && sortOrder === "desc"),
		},
		{
			id: "filter",
			label: "Filter",
			icon: Filter,
			isActive: favoritesOnly,
		},
		{
			id: "search",
			label: "Search",
			icon: Search,
			isActive: !!searchQuery,
		},
	] as const;

	return (
		<div className="flex flex-col py-2">
			{mainMenuItems.map((item) => {
				const Icon = "icon" in item ? item.icon : undefined;
				const isDisabled = "disabled" in item && item.disabled;

				return (
					<button
						key={item.id}
						onClick={() =>
							!isDisabled && onViewChange(item.id as MenuView)
						}
						disabled={isDisabled}
						className={`hover:bg-muted relative flex items-center justify-between px-4 py-3 text-left transition-colors ${
							isDisabled ? "cursor-not-allowed opacity-50" : ""
						}`}
					>
						{/* Active indicator bar */}
						<div
							className={`absolute top-1/2 left-0 h-8 w-[2px] -translate-y-1/2 rounded-r-full transition-colors ${
								item.isActive ? "bg-primary" : "bg-transparent"
							}`}
						/>

						<div className="flex items-center gap-3 pl-2">
							{"image" in item && item.image ? (
								<Image
									src={item.image}
									alt={item.label}
									width={24}
									height={24}
									className="h-6 w-6 rounded-md object-cover"
								/>
							) : Icon ? (
								<Icon className="text-muted-foreground h-6 w-6" />
							) : null}
							<span className="truncate font-medium">
								{item.label}
							</span>
						</div>
						<ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
					</button>
				);
			})}
		</div>
	);
}
