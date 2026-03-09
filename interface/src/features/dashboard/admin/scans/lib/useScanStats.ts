"use client";

import { Channel } from "@/lib/api/channel";
import { useScanStatuses } from "@/lib/hooks";
import { mergeChannelsWithStatuses } from "./mergeChannelsWithStatuses";
import type { ChannelWithStatus } from "../types";

export interface ScanStats {
	channels: ChannelWithStatus[];
	unscannedOrFailedCount: number;
	activeScans: number;
	successfulScans: number;
	enabledChannelsCount: number;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useScanStats(guildId: string, serverChannels: Channel[]): ScanStats {
	const {
		data: scanStatuses = [],
		isLoading,
		error,
		refetch,
	} = useScanStatuses(guildId);

	const channels = mergeChannelsWithStatuses(serverChannels, scanStatuses);

	return {
		channels,
		unscannedOrFailedCount: channels.filter(
			(ch) => (!ch.scanStatus || ch.scanStatus.status === "FAILED") && ch.message_scan_enabled
		).length,
		activeScans: channels.filter(
			(ch) => ch.scanStatus?.status === "RUNNING" || ch.scanStatus?.status === "QUEUED"
		).length,
		successfulScans: channels.filter(
			(ch) => ch.scanStatus?.status === "SUCCEEDED" && ch.message_scan_enabled
		).length,
		enabledChannelsCount: channels.filter((ch) => ch.message_scan_enabled).length,
		isLoading,
		error: error as Error | null,
		refetch,
	};
}
