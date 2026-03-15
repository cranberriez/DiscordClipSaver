"use client";

import { useStartBulkScan } from "@/lib/hooks";
import type { ChannelWithStatus } from "../types";

export function useBulkScanActions(
	guildId: string,
	channels: ChannelWithStatus[]
) {
	const { mutate, isPending } = useStartBulkScan(guildId);

	const scanUnscannedOrFailed = () => {
		const channelIds = channels
			.filter(
				(ch) =>
					(!ch.scanStatus || ch.scanStatus.status === "FAILED") &&
					ch.message_scan_enabled
			)
			.map((ch) => ch.id);

		if (channelIds.length === 0) {
			alert("No unscanned or failed channels found");
			return;
		}

		mutate({
			channelIds,
			options: { isUpdate: false, autoContinue: true, rescan: "stop" },
		});
	};

	const updateAllChannels = () => {
		const channelIds = channels
			.filter((ch) => ch.message_scan_enabled)
			.map((ch) => ch.id);

		if (channelIds.length === 0) {
			alert("No channels enabled for scanning");
			return;
		}

		mutate({
			channelIds,
			options: { isUpdate: true, autoContinue: true, rescan: "stop" },
		});
	};

	const historicalScan = (scanType: "backfill" | "integrity" | "force") => {
		const channelIds = channels
			.filter((ch) => ch.message_scan_enabled)
			.map((ch) => ch.id);

		if (channelIds.length === 0) {
			alert("No channels enabled for scanning");
			return;
		}

		if (scanType === "force") {
			const confirmed = confirm(
				`⚠️ FORCE UPDATE MODE\n\n` +
					`This will reprocess ALL messages in ${channelIds.length} channels, ` +
					`even if they've already been scanned. This is expensive and should only ` +
					`be used if settings have changed.\n\n` +
					`Thumbnails will NOT be regenerated if they already exist.\n\n` +
					`Continue?`
			);
			if (!confirmed) return;
		}

		const options = {
			autoContinue: true,
			isUpdate: false,
			isHistorical: false,
			isBackfill: false,
			rescan: "stop" as "stop" | "continue" | "update",
		};

		if (scanType === "backfill") {
			options.isBackfill = true;
			options.rescan = "stop";
		} else if (scanType === "integrity") {
			options.isHistorical = true;
			options.rescan = "continue";
		} else if (scanType === "force") {
			options.isHistorical = true;
			options.rescan = "update";
		}

		mutate({ channelIds, options });
	};

	return {
		scanUnscannedOrFailed,
		updateAllChannels,
		historicalScan,
		isPending,
	};
}
