"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, Server } from "lucide-react";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import { matchesQuery } from "../../lib/filtering";
import { cn } from "@/lib/utils";
import type { GuildWithStats } from "@/lib/api/guild";

function GuildIcon({
	iconUrl,
	name,
	className,
}: {
	iconUrl: string | null;
	name: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative h-7 w-7 flex-none overflow-hidden rounded-full",
				className
			)}
		>
			{iconUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={iconUrl}
					alt={name || "Server icon"}
					className="h-full w-full object-cover"
				/>
			) : (
				<div className="bg-muted flex h-full w-full items-center justify-center">
					<Server className="text-muted-foreground h-4 w-4" />
				</div>
			)}
		</div>
	);
}

interface ServerSwitcherProps {
	guilds: GuildWithStats[];
	isLoading: boolean;
	selectedGuild?: { name: string; icon_url: string | null } | null;
}

/**
 * Server chip + searchable dropdown for switching guilds.
 * Selecting a guild resets channel/author/tag filters (store behavior).
 */
export function ServerSwitcher({
	guilds,
	isLoading,
	selectedGuild,
}: ServerSwitcherProps) {
	const { selectedGuildId, setGuildId } = useClipFiltersStore();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const filteredGuilds = useMemo(
		() => guilds.filter((g) => matchesQuery(g.name, query)),
		[guilds, query]
	);

	return (
		<Popover
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (o) setQuery("");
			}}
		>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="border-border bg-popover hover:bg-popover-hover flex h-9 max-w-52 flex-none cursor-pointer items-center gap-2 rounded-full border py-0.5 pr-3 pl-1 text-sm font-semibold transition-colors"
					aria-label="Select a server"
				>
					<GuildIcon
						iconUrl={selectedGuild?.icon_url ?? null}
						name={selectedGuild?.name ?? ""}
					/>
					<span className="truncate">
						{selectedGuild?.name || "Select Server"}
					</span>
					<ChevronDown className="text-muted-foreground h-3.5 w-3.5 flex-none" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-0">
				<div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
					<Search className="text-muted-foreground h-3.5 w-3.5 flex-none" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search servers..."
						className="h-7 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
						autoFocus
					/>
				</div>
				<div className="max-h-64 overflow-y-auto p-1.5">
					{isLoading ? (
						<div className="text-muted-foreground px-3 py-4 text-center text-sm">
							Loading servers...
						</div>
					) : filteredGuilds.length === 0 ? (
						<div className="text-muted-foreground px-3 py-4 text-center text-sm">
							No servers match
						</div>
					) : (
						filteredGuilds.map((guild) => {
							const isCurrent = guild.id === selectedGuildId;
							return (
								<button
									key={guild.id}
									type="button"
									onClick={() => {
										if (!isCurrent) setGuildId(guild.id);
										setOpen(false);
									}}
									className={cn(
										"hover:bg-accent flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
										isCurrent && "bg-primary/10"
									)}
								>
									<GuildIcon
										iconUrl={guild.icon_url}
										name={guild.name}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium">
											{guild.name}
										</span>
										{guild.clip_count != null && (
											<span className="text-muted-foreground block text-xs">
												{guild.clip_count.toLocaleString()}{" "}
												clips
											</span>
										)}
									</span>
									{isCurrent && (
										<Check className="text-primary h-4 w-4 flex-none" />
									)}
								</button>
							);
						})
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
