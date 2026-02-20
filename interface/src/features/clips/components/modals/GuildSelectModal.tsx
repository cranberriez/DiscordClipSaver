"use client";

import { useState, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Server } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { GuildWithStats } from "@/lib/api/guild";

interface GuildSelectModalProps {
	guilds: GuildWithStats[];
	isLoading?: boolean;
}

export function GuildSelectModal({
	guilds,
	isLoading = false,
}: GuildSelectModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const { isGuildModalOpen, closeGuildModal, setGuildId, selectedGuildId } =
		useClipFiltersStore();

	// Filter guilds by search query
	const filteredGuilds = useMemo(() => {
		if (!searchQuery.trim()) return guilds;
		const query = searchQuery.toLowerCase();
		return guilds.filter((guild) =>
			guild.name.toLowerCase().includes(query)
		);
	}, [guilds, searchQuery]);

	const handleSelectGuild = (guildId: string) => {
		setGuildId(guildId);
		closeGuildModal();
		setSearchQuery("");
	};

	const getGuildIconUrl = (guild: GuildWithStats): string | null => {
		return guild.icon_url;
	};

	return (
		<Dialog open={isGuildModalOpen} onOpenChange={closeGuildModal}>
			<DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
				<DialogHeader>
					<DialogTitle>Select a Server</DialogTitle>
				</DialogHeader>

				{/* Search bar */}
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search servers..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* Guild grid */}
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="text-muted-foreground py-12 text-center">
							Loading servers...
						</div>
					) : filteredGuilds.length === 0 ? (
						<div className="text-muted-foreground py-12 text-center">
							{searchQuery
								? "No servers match your search"
								: "No servers with clips found"}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{filteredGuilds.map((guild) => {
								const iconUrl = getGuildIconUrl(guild);
								const isSelected = selectedGuildId === guild.id;

								return (
									<button
										key={guild.id}
										className={`h-auto rounded-lg border p-4 text-left transition-colors ${
											isSelected
												? "bg-muted/50 border-white"
												: "border-border bg-card hover:bg-muted/30"
										}`}
										onClick={() =>
											handleSelectGuild(guild.id)
										}
									>
										<div className="flex w-full items-center gap-3">
											{/* Guild icon */}
											<div className="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
												{iconUrl ? (
													<img
														src={iconUrl}
														alt={guild.name}
														className="h-full w-full object-cover"
													/>
												) : (
													<Server className="text-muted-foreground h-6 w-6" />
												)}
											</div>

											{/* Guild info */}
											<div className="min-w-0 flex-1">
												<p className="truncate font-semibold">
													{guild.name}
												</p>
												<p
													className={`text-xs ${
														guild.clip_count === 0
															? "font-medium text-red-500"
															: "text-muted-foreground"
													}`}
												>
													{guild.clip_count === 0
														? "No Clips"
														: `${
																guild.clip_count
															} ${
																guild.clip_count ===
																1
																	? "clip"
																	: "clips"
															}`}
												</p>
											</div>
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end pt-4">
					<Button onClick={closeGuildModal}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
