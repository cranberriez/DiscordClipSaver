"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Search, Server } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { GuildWithStats } from "@/lib/api/guild";

interface GuildSelectContentProps {
	guilds: GuildWithStats[];
	isLoading?: boolean;
	onSelect?: () => void;
}

export function GuildSelectContent({
	guilds,
	isLoading = false,
	onSelect,
}: GuildSelectContentProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const { setGuildId, selectedGuildId } = useClipFiltersStore();

	const filteredGuilds = useMemo(() => {
		if (!searchQuery.trim()) return guilds;
		const query = searchQuery.toLowerCase();
		return guilds.filter((guild) =>
			guild.name.toLowerCase().includes(query)
		);
	}, [guilds, searchQuery]);

	const handleSelectGuild = (guildId: string) => {
		setGuildId(guildId);
		setSearchQuery("");
		onSelect?.();
	};

	const getGuildIconUrl = (guild: GuildWithStats): string | null => {
		return guild.icon_url;
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="p-4 pb-2">
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search servers..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 pt-2">
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
									onClick={() => handleSelectGuild(guild.id)}
								>
									<div className="flex w-full items-center gap-3">
										<div className="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
											{iconUrl ? (
												<Image
													src={iconUrl}
													alt={guild.name}
													width={48}
													height={48}
													className="h-full w-full object-cover"
												/>
											) : (
												<Server className="text-muted-foreground h-6 w-6" />
											)}
										</div>

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
													: `${guild.clip_count} ${
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
		</div>
	);
}
