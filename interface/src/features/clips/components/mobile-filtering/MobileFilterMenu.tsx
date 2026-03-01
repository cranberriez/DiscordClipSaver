"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GuildWithStats } from "@/lib/api/guild";
import type { ChannelWithStats } from "@/lib/api/channel";
import type { AuthorWithStats } from "@/lib/api/author";
import {
	GuildSelectContent,
	ChannelSelectContent,
	AuthorSelectContent,
} from "../clip-filtering";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";

import { MainMenu } from "./MainMenu";
import { SubMenuWrapper, MenuButton } from "./SharedComponents";
import { SortSubMenu } from "./SortSubMenu";
import { FilterSubMenu } from "./FilterSubMenu";
import { SearchSubMenu } from "./SearchSubMenu";
import { TagSubMenu } from "./TagSubMenu";
import type { MenuView } from "./types";

export interface MobileFilterMenuProps {
	guildName: string;
	guildIcon: string | null;
	guilds: GuildWithStats[];
	guildsLoading: boolean;
	channels: ChannelWithStats[];
	channelsLoading: boolean;
	authors: AuthorWithStats[];
}

export function MobileFilterMenu({
	guildName,
	guildIcon,
	guilds,
	guildsLoading,
	channels,
	channelsLoading,
	authors,
}: MobileFilterMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [currentView, setCurrentView] = useState<MenuView>("main");

	const toggleMenu = () => {
		setIsOpen((prev) => !prev);
	};

	const getSubMenuConfig = () => {
		switch (currentView) {
			case "server":
				return {
					title: "Select Server",
					className: "flex h-[75dvh] flex-col",
					content: (
						<GuildSelectContent
							guilds={guilds}
							isLoading={guildsLoading}
							onSelect={() => setIsOpen(false)}
						/>
					),
				};
			case "channel":
				return {
					title: "Select Channels",
					className: "flex h-[75dvh] flex-col",
					content: (
						<ChannelSelectContent
							channels={channels}
							isLoading={channelsLoading}
						/>
					),
				};
			case "author":
				return {
					title: "Select Authors",
					className: "flex h-[75dvh] flex-col",
					content: <AuthorSelectContent authors={authors} />,
				};
			case "tag":
				return {
					title: "Select Tags",
					className: "flex h-[75dvh] flex-col",
					content: (
						<TagSubMenu
							guildId={
								guilds.find(
									(g) =>
										g.id ===
										useClipFiltersStore.getState()
											.selectedGuildId
								)?.id || ""
							}
						/>
					),
				};
			case "sort":
				return {
					title: "Sort",
					content: <SortSubMenu />,
				};
			case "filter":
				return {
					title: "Filter",
					content: <FilterSubMenu />,
				};
			case "search":
				return {
					title: "Search",
					content: (
						<SearchSubMenu
							onBack={() => setCurrentView("main")}
							closeMenu={() => setIsOpen(false)}
						/>
					),
				};
			default:
				return null;
		}
	};

	const subMenuConfig = getSubMenuConfig();

	return (
		<div className="bg-sidebar flex items-center gap-2 rounded-xl p-1 sm:hidden">
			<MenuButton onClick={toggleMenu} isOpen={isOpen} />

			<AnimatePresence onExitComplete={() => setCurrentView("main")}>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="absolute top-full right-3 left-3 z-50 mt-2"
					>
						<div className="bg-popover border-border flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-xl border shadow-xl">
							<AnimatePresence mode="wait" initial={false}>
								{currentView === "main" ? (
									<motion.div
										key="main"
										initial={{ x: -20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: -20, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<MainMenu
											onViewChange={setCurrentView}
											guildIcon={guildIcon}
											guildName={guildName}
										/>
									</motion.div>
								) : subMenuConfig ? (
									<motion.div
										key={currentView}
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
										className={subMenuConfig.className}
									>
										<SubMenuWrapper
											title={subMenuConfig.title}
											onBack={() =>
												setCurrentView("main")
											}
										>
											{subMenuConfig.content}
										</SubMenuWrapper>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
