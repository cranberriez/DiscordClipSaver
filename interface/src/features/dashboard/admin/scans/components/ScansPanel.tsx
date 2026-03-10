"use client";

import { Channel } from "@/lib/api/channel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoPanel, BulkScanActions, ScanStatusTable } from "../index";
import { toast } from "sonner";
import { useScanStatusNotifications } from "../lib/useScanStatusNotifications";
import { useScanStats } from "../lib/useScanStats";
import { useBulkScanActions } from "../lib/useBulkScanActions";

interface ScansPanelProps {
	guildId: string;
	channels: Channel[];
}

export function ScansPanel({
	guildId,
	channels: serverChannels,
}: ScansPanelProps) {
	const {
		channels,
		totalChannels,
		enabledChannelsCount,
		failedScans,
		unscannedOrFailedCount,
		activeScans,
		successfulScans,
		totalMessagesScanned,
		totalClips,
		isLoading,
		error,
		refetch,
	} = useScanStats(guildId, serverChannels);

	const {
		scanUnscannedOrFailed,
		updateAllChannels,
		historicalScan,
		isPending,
	} = useBulkScanActions(guildId, channels);

	useScanStatusNotifications(
		channels.map((ch) => ch.scanStatus).filter(Boolean) as NonNullable<
			(typeof channels)[number]["scanStatus"]
		>[],
		{
			onSuccess: (scans) => {
				if (scans.length === 1) {
					const name =
						serverChannels.find(
							(ch) => ch.id === scans[0].channel_id
						)?.name ?? "Unknown";
					toast.success(
						`Scan for channel ${name} completed successfully`
					);
				} else {
					toast.success(
						`${scans.length} scans completed successfully`
					);
				}
			},
			onFailure: (scans) => {
				if (scans.length === 1) {
					const scan = scans[0];
					const name =
						serverChannels.find((ch) => ch.id === scan.channel_id)
							?.name ?? "Unknown";
					toast.error(
						`Scan for channel ${name} failed${scan.error_message ? `: ${scan.error_message}` : ""}`
					);
				} else {
					toast.error(`${scans.length} scans failed`);
				}
			},
			onCancelled: (scans) => {
				if (scans.length === 1) {
					const name =
						serverChannels.find(
							(ch) => ch.id === scans[0].channel_id
						)?.name ?? "Unknown";
					toast.info(`Scan for channel ${name} was cancelled`);
				} else {
					toast.info(`${scans.length} scans were cancelled`);
				}
			},
		}
	);

	if (isLoading) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-muted-foreground">Loading...</p>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="border-destructive/50 bg-destructive/10">
				<CardContent className="pt-6">
					<p className="text-destructive text-sm">
						Error:{" "}
						{error instanceof Error
							? error.message
							: "Failed to load scan statuses"}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (channels.length === 0) {
		return (
			<div className="space-y-4">
				<Card className="border-yellow-500/50 bg-yellow-500/10">
					<CardHeader>
						<CardTitle className="text-yellow-600 dark:text-yellow-400">
							No Channels Found
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-sm">
							This guild has no channels in the database. The
							Discord bot needs to sync channels first.
						</p>
						<p className="text-muted-foreground text-sm">
							Make sure the bot is in the server and has
							permission to view channels.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row">
				<div className="w-full shrink-0 sm:w-60">
					<InfoPanel
						totalChannels={totalChannels}
						enabledChannelsCount={enabledChannelsCount}
						failedScans={failedScans}
						activeScans={activeScans}
						successfulScans={successfulScans}
						totalMessagesScanned={totalMessagesScanned}
						totalClips={totalClips}
					/>
				</div>
				<BulkScanActions
					unscannedOrFailedCount={unscannedOrFailedCount}
					enabledChannelsCount={enabledChannelsCount}
					isPending={isPending}
					onScanUnscannedOrFailed={scanUnscannedOrFailed}
					onUpdateAllChannels={updateAllChannels}
					onHistoricalScan={historicalScan}
				/>
			</div>

			<ScanStatusTable channels={channels} onRefresh={refetch} />
		</div>
	);
}
