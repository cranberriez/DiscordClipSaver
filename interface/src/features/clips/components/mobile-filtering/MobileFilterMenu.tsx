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
								{currentView === "main" && (
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
								)}
								{currentView === "server" && (
									<motion.div
										key="server"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
										className="flex h-[75dvh] flex-col"
									>
										<SubMenuWrapper
											title="Select Server"
											onBack={() =>
												setCurrentView("main")
											}
										>
											<GuildSelectContent
												guilds={guilds}
												isLoading={guildsLoading}
												onSelect={() =>
													setIsOpen(false)
												}
											/>
										</SubMenuWrapper>
									</motion.div>
								)}
								{currentView === "channel" && (
									<motion.div
										key="channel"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
										className="flex h-[75dvh] flex-col"
									>
										<SubMenuWrapper
											title="Select Channels"
											onBack={() =>
												setCurrentView("main")
											}
										>
											<ChannelSelectContent
												channels={channels}
												isLoading={channelsLoading}
											/>
										</SubMenuWrapper>
									</motion.div>
								)}
								{currentView === "author" && (
									<motion.div
										key="author"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
										className="flex h-[75dvh] flex-col"
									>
										<SubMenuWrapper
											title="Select Authors"
											onBack={() =>
												setCurrentView("main")
											}
										>
											<AuthorSelectContent
												authors={authors}
											/>
										</SubMenuWrapper>
									</motion.div>
								)}
								{currentView === "tag" && (
									<motion.div
										key="tag"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
										className="flex h-[75dvh] flex-col"
									>
										<SubMenuWrapper
											title="Select Tags"
											onBack={() =>
												setCurrentView("main")
											}
										>
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
										</SubMenuWrapper>
									</motion.div>
								)}
								{currentView === "sort" && (
									<motion.div
										key="sort"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<SubMenuWrapper
											title="Sort"
											onBack={() =>
												setCurrentView("main")
											}
										>
											<SortSubMenu />
										</SubMenuWrapper>
									</motion.div>
								)}
								{currentView === "filter" && (
									<motion.div
										key="filter"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<SubMenuWrapper
											title="Filter"
											onBack={() =>
												setCurrentView("main")
											}
										>
											<FilterSubMenu />
										</SubMenuWrapper>
									</motion.div>
								)}
								{currentView === "search" && (
									<motion.div
										key="search"
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 20, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<SubMenuWrapper
											title="Search"
											onBack={() =>
												setCurrentView("main")
											}
										>
											<SearchSubMenu
												onBack={() =>
													setCurrentView("main")
												}
												closeMenu={() =>
													setIsOpen(false)
												}
											/>
										</SubMenuWrapper>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
