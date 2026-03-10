"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
	getSortedChannelTypes,
	ChannelTypeHeader,
} from "@/components/composite/ChannelOrganizer";
import { useScanVisibilityStore } from "../stores/useScanVisibilityStore";
import { sortChannels } from "../lib/scanStatusTableHelpers";
import { useScanTableState } from "../lib/useScanTableState";
import type { ChannelWithStatus } from "../types";
import { ChannelRow } from "./ChannelRow";
import { ScanToolbar } from "./ScanToolbar";

interface ScanStatusTableProps {
	channels: ChannelWithStatus[];
	onRefresh: () => void;
}

export function ScanStatusTable({ channels, onRefresh }: ScanStatusTableProps) {
	const { simpleView, sortBy } = useScanVisibilityStore();

	const {
		processedChannels,
		groupedChannels,
		selectedIds,
		allSelected,
		someSelected,
		bulkPending,
		handleGlobalCheckbox,
		handleRowCheck,
		handleChannelToggle,
		handleBulkToggle,
	} = useScanTableState(channels, onRefresh);

	const sortedChannelTypes = getSortedChannelTypes();

	return (
		<div className="space-y-3">
			<ScanToolbar
				allSelected={allSelected}
				someSelected={someSelected}
				selectedCount={selectedIds.size}
				bulkPending={bulkPending}
				onGlobalCheckbox={handleGlobalCheckbox}
				onBulkEnable={() => handleBulkToggle(true)}
				onBulkDisable={() => handleBulkToggle(false)}
				onRefresh={onRefresh}
			/>

			<div className="space-y-0">
				{sortedChannelTypes.map((type) => {
					const channelsOfType = groupedChannels[type];
					if (!channelsOfType || channelsOfType.length === 0)
						return null;

					const sorted = sortChannels(channelsOfType, sortBy);
					const typeTotal = channelsOfType.length;
					const typeActive = channelsOfType.filter(
						(ch) =>
							ch.scanStatus?.status === "RUNNING" ||
							ch.scanStatus?.status === "QUEUED"
					).length;

					return (
						<React.Fragment key={type}>
							<div className="flex items-center gap-2 py-2 pl-1">
								<ChannelTypeHeader type={type} />
								<span className="text-muted-foreground/50 text-xs">
									{typeTotal}
								</span>
								{typeActive > 0 && (
									<Badge className="border-blue-500/30 bg-blue-500/20 text-xs text-blue-400">
										{typeActive} active
									</Badge>
								)}
							</div>

							<div className="space-y-1.5">
								{sorted.map((channel) => (
									<ChannelRow
										key={channel.id}
										channel={channel}
										simpleView={simpleView}
										checked={selectedIds.has(channel.id)}
										onCheck={handleRowCheck}
										onToggleEnabled={handleChannelToggle}
									/>
								))}
							</div>
						</React.Fragment>
					);
				})}

				{processedChannels.length === 0 && channels.length > 0 && (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No channels match the current filters.
					</div>
				)}
				{channels.length === 0 && (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No channels found
					</div>
				)}
			</div>
		</div>
	);
}
