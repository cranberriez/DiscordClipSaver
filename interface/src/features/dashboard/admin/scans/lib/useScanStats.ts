"use client";

import { Channel } from "@/lib/api/channel";
import { useScanStatuses, useGuildStats } from "@/lib/hooks";
import { mergeChannelsWithStatuses } from "./mergeChannelsWithStatuses";
import type { ChannelWithStatus } from "../types";

export interface ScanStats {
	channels: ChannelWithStatus[];
	totalChannels: number;
	enabledChannelsCount: number;
	failedScans: number;
	unscannedOrFailedCount: number;
	activeScans: number;
	successfulScans: number;
	totalMessagesScanned: number;
	totalClips: number;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useScanStats(
	guildId: string,
	serverChannels: Channel[]
): ScanStats {
	const {
		data: scanStatuses = [],
		isLoading,
		error,
		refetch,
	} = useScanStatuses(guildId);

	const { data: guildStats } = useGuildStats([guildId], {
		withClipCount: true,
	});

	const channels = mergeChannelsWithStatuses(serverChannels, scanStatuses);

	const failedScans = channels.filter(
		(ch) => ch.scanStatus?.status === "FAILED"
	).length;

	return {
		channels,
		totalChannels: channels.length,
		enabledChannelsCount: channels.filter((ch) => ch.message_scan_enabled)
			.length,
		failedScans,
		unscannedOrFailedCount: channels.filter(
			(ch) =>
				(!ch.scanStatus || ch.scanStatus.status === "FAILED") &&
				ch.message_scan_enabled
		).length,
		activeScans: channels.filter(
			(ch) =>
				ch.scanStatus?.status === "RUNNING" ||
				ch.scanStatus?.status === "QUEUED"
		).length,
		successfulScans: channels.filter(
			(ch) =>
				ch.scanStatus?.status === "SUCCEEDED" && ch.message_scan_enabled
		).length,
		totalClips: guildStats?.[0]?.clip_count ?? 0,
		totalMessagesScanned: channels.reduce(
			(sum, ch) => sum + (ch.scanStatus?.total_messages_scanned ?? 0),
			0
		),
		isLoading,
		error: error as Error | null,
		refetch,
	};
}
