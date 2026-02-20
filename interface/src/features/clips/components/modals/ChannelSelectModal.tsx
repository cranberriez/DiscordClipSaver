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
import { Search, Hash } from "lucide-react";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";
import type { ChannelWithStats } from "@/lib/api/channel";
import { cn } from "@/lib/utils";

interface ChannelSelectModalProps {
	channels: ChannelWithStats[];
	isLoading?: boolean;
}

export function ChannelSelectModal({
	channels,
	isLoading = false,
}: ChannelSelectModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const {
		isChannelModalOpen,
		closeChannelModal,
		selectedChannelIds,
		setChannelIds,
	} = useClipFiltersStore();

	// Filter out channels with 0 clips
	const channelsWithClips = useMemo(() => {
		return channels.filter((channel) => channel.clip_count > 0);
	}, [channels]);

	// Filter channels by search query
	const filteredChannels = useMemo(() => {
		if (!searchQuery.trim()) return channelsWithClips;
		const query = searchQuery.toLowerCase();
		return channelsWithClips.filter((channel) =>
			channel.name.toLowerCase().includes(query)
		);
	}, [channelsWithClips, searchQuery]);

	const handleToggleChannel = (channelId: string) => {
		if (selectedChannelIds.includes(channelId)) {
			setChannelIds(selectedChannelIds.filter((id) => id !== channelId));
		} else {
			setChannelIds([...selectedChannelIds, channelId]);
		}
	};

	const handleSelectAll = () => {
		setChannelIds(channelsWithClips.map((c) => c.id));
	};

	const handleClearAll = () => {
		setChannelIds([]);
	};

	const allSelected = selectedChannelIds.length === channelsWithClips.length;
	const noneSelected = selectedChannelIds.length === 0;

	return (
		<Dialog open={isChannelModalOpen} onOpenChange={closeChannelModal}>
			<DialogContent className="flex max-h-[80vh] flex-col sm:!max-w-6xl">
				<DialogHeader>
					<DialogTitle>Select Channels</DialogTitle>
				</DialogHeader>

				{/* Search bar */}
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search channels..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* Bulk actions */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSelectAll}
						disabled={allSelected}
					>
						Select All
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearAll}
						disabled={noneSelected}
					>
						Clear All
					</Button>
					<span className="text-muted-foreground ml-auto text-sm">
						{selectedChannelIds.length} of{" "}
						{channelsWithClips.length} selected
					</span>
				</div>

				{/* Channel grid */}
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="text-muted-foreground py-12 text-center">
							Loading channels...
						</div>
					) : filteredChannels.length === 0 ? (
						<div className="text-muted-foreground py-12 text-center">
							{searchQuery
								? "No channels match your search"
								: "No channels with clips found"}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredChannels.map((channel) => {
								const isSelected = selectedChannelIds.includes(
									channel.id
								);

								return (
									<div
										key={channel.id}
										className={cn(
											"flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors",
											isSelected
												? "bg-primary/10 border-primary"
												: "hover:bg-muted"
										)}
										onClick={() =>
											handleToggleChannel(channel.id)
										}
									>
										<div className="flex min-w-0 flex-1 items-center gap-2">
											<Hash
												className={cn(
													"text-muted-foreground h-5 w-5 flex-shrink-0",
													isSelected &&
														"text-blue-400"
												)}
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium">
													{channel.name}
												</p>
												<p className="text-muted-foreground text-xs">
													{channel.clip_count}{" "}
													{channel.clip_count === 1
														? "clip"
														: "clips"}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end pt-4">
					<Button onClick={closeChannelModal}>Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
