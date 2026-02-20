"use client";

import { Step } from "./Step";
import { useChannels, useStartBulkScan, useScanStatuses } from "@/lib/hooks";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSetupStoreHydrated } from "../../stores/useSetupStore";
import { Button } from "@/components/ui/button";
import type { Guild } from "@/lib/api/guild";

export const INITIAL_SCAN_STORAGE_KEY =
	"discord-clip-saver-initial-scan-completed";
export const INITIAL_SCAN_INITIATED_KEY =
	"discord-clip-saver-initial-scan-initiated";

export function InitialScan({
	guild,
	onComplete,
	shouldStart = false,
}: {
	guild: Guild;
	onComplete: () => void;
	shouldStart?: boolean;
}) {
	const [scanStarted, setScanStarted] = useState(false);
	const [failedChannels, setFailedChannels] = useState<string[]>([]);
	const [completionTriggered, setCompletionTriggered] = useState(false);

	const { data: serverChannels = [], isLoading: isLoadingChannels } =
		useChannels(guild.id);
	const { data: scanStatuses = [], isLoading: isLoadingStatuses } =
		useScanStatuses(guild.id);
	const startBulkScanMutation = useStartBulkScan(guild.id);

	const {
		startStep,
		updateStepState,
		completeStep,
		getStepData,
		isHydrated,
	} = useSetupStoreHydrated();

	const stepData = getStepData("initial_scan");

	// Check if initial scan was already completed
	const isInitialScanCompleted = useCallback(() => {
		if (typeof window === "undefined") return false;
		return (
			localStorage.getItem(`${INITIAL_SCAN_STORAGE_KEY}-${guild.id}`) ===
			"true"
		);
	}, [guild.id]);

	// Check if initial scan was already initiated (requested)
	const isInitialScanInitiated = useCallback(() => {
		if (typeof window === "undefined") return false;
		return (
			localStorage.getItem(
				`${INITIAL_SCAN_INITIATED_KEY}-${guild.id}`
			) === "true"
		);
	}, [guild.id]);

	// Mark initial scan as completed
	const markInitialScanCompleted = useCallback(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem(`${INITIAL_SCAN_STORAGE_KEY}-${guild.id}`, "true");
		// Also clear the initiated flag so it doesn't block future rescans if needed (though for initial scan it's fine)
	}, [guild.id]);

	// Mark initial scan as initiated
	const markInitialScanInitiated = useCallback(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem(
			`${INITIAL_SCAN_INITIATED_KEY}-${guild.id}`,
			"true"
		);
	}, [guild.id]);

	// Get scan statistics
	const scanStats = useMemo(
		() => ({
			queued: scanStatuses.filter((s) => s.status === "QUEUED").length,
			running: scanStatuses.filter((s) => s.status === "RUNNING").length,
			completed: scanStatuses.filter((s) => s.status === "SUCCEEDED")
				.length,
			failed: scanStatuses.filter((s) => s.status === "FAILED").length,
			total: scanStatuses.length,
		}),
		[scanStatuses]
	);

	// Get failed channel details
	const failedScans = useMemo(
		() => scanStatuses.filter((s) => s.status === "FAILED"),
		[scanStatuses]
	);

	// Get channels that need scanning (don't have any scan status and aren't category channels)
	const getChannelsNeedingScans = useCallback(() => {
		const scannedChannelIds = new Set(
			scanStatuses.map((s) => s.channel_id)
		);
		return serverChannels.filter(
			(channel) =>
				!scannedChannelIds.has(channel.id) &&
				channel.type !== "category"
		);
	}, [scanStatuses, serverChannels]);

	// Filter out category channels from all server channels for display
	const scannableChannels = serverChannels.filter(
		(channel) => channel.type !== "category"
	);

	const channelsNeedingScans = getChannelsNeedingScans();
	const alreadyScannedCount =
		scannableChannels.length - channelsNeedingScans.length;

	const startInitialScan = useCallback(
		(channelsToScan = serverChannels) => {
			console.log(
				"Starting initial scan for",
				channelsToScan.length,
				"channels"
			);

			// Set scan started immediately to prevent duplicate requests
			setScanStarted(true);
			markInitialScanInitiated();

			const channelIds = channelsToScan.map((ch) => ch.id);

			startBulkScanMutation.mutate(
				{
					channelIds,
					options: {
						isUpdate: false, // Start from newest message
						limit: 500, // Higher limit for initial scan
						autoContinue: false, // Don't auto-continue
						rescan: "stop", // Stop on duplicates
					},
				},
				{
					onSuccess: (result) => {
						console.log("Initial scan started:", result);
					},
					onError: (error) => {
						console.error("Failed to start initial scan:", error);
						setScanStarted(false);
						// Don't clear initiated flag on error immediately, user can retry
						updateStepState(
							"initial_scan",
							"error",
							"Failed to start initial scan"
						);
					},
				}
			);
		},
		[
			serverChannels,
			startBulkScanMutation,
			updateStepState,
			markInitialScanInitiated,
		]
	);

	// Guard against double-firing and infinite loops
	const initiationGuard = useRef(false);

	// Consolidated initialization effect
	useEffect(() => {
		if (
			!shouldStart ||
			completionTriggered ||
			initiationGuard.current ||
			isLoadingChannels ||
			isLoadingStatuses ||
			!isHydrated
		) {
			return;
		}

		initiationGuard.current = true;

		if (isInitialScanCompleted()) {
			setCompletionTriggered(true);
			completeStep("initial_scan");
			setTimeout(() => onComplete(), 500);
			return;
		}

		if (stepData.state === null) {
			startStep("initial_scan");
		}

		const hasActiveScans = scanStatuses.some((s) =>
			["QUEUED", "RUNNING"].includes(s.status)
		);
		const hasFailedScans = scanStatuses.some((s) => s.status === "FAILED");
		const channelsToScan = getChannelsNeedingScans();
		const alreadyInitiated = isInitialScanInitiated();
		const allChannelsHaveStatus = channelsToScan.length === 0;

		if (allChannelsHaveStatus) {
			if (hasActiveScans || hasFailedScans) {
				setScanStarted(true);
			} else {
				setCompletionTriggered(true);
				markInitialScanCompleted();
				completeStep("initial_scan");
				setTimeout(() => onComplete(), 1000);
			}
		} else {
			if (hasActiveScans || alreadyInitiated) {
				setScanStarted(true);
			} else {
				startInitialScan(channelsToScan);
			}
		}
	}, [
		shouldStart,
		completionTriggered,
		isLoadingChannels,
		isLoadingStatuses,
		isHydrated,
		// Stable dependencies
		isInitialScanCompleted,
		completeStep,
		onComplete,
		stepData.state,
		startStep,
		scanStatuses,
		getChannelsNeedingScans,
		markInitialScanCompleted,
		startInitialScan,
		isInitialScanInitiated,
	]);

	// Monitor scan completion
	useEffect(() => {
		if (scanStarted && scanStats.total > 0 && !completionTriggered) {
			const allCompleted =
				scanStats.queued === 0 && scanStats.running === 0;

			if (allCompleted) {
				if (scanStats.failed === 0) {
					// All scans succeeded
					setCompletionTriggered(true);
					markInitialScanCompleted();
					completeStep("initial_scan");
					setTimeout(() => onComplete(), 1000);
				} else {
					// Some scans failed
					const failedChannelIds = failedScans.map(
						(s) => s.channel_id
					);
					setFailedChannels(failedChannelIds);
					updateStepState(
						"initial_scan",
						"need_action",
						`${scanStats.failed} channels failed to scan`
					);
				}
			}
		}
	}, [
		scanStarted,
		scanStats,
		failedScans,
		completionTriggered,
		completeStep,
		onComplete,
		updateStepState,
	]);

	const retryFailedScans = () => {
		console.log(
			"Retrying failed scans for",
			failedChannels.length,
			"channels"
		);

		startBulkScanMutation.mutate(
			{
				channelIds: failedChannels,
				options: {
					isUpdate: false,
					limit: 500,
					autoContinue: false,
					rescan: "stop",
				},
			},
			{
				onSuccess: (result) => {
					console.log("Retry scan started:", result);
					// Reset to loading state to monitor the retry
					startStep("initial_scan");
					setFailedChannels([]);
				},
				onError: (error) => {
					console.error("Failed to retry scans:", error);
				},
			}
		);
	};

	const getChannelName = (channelId: string) => {
		const channel = serverChannels.find((ch) => ch.id === channelId);
		return channel?.name || "Unknown";
	};

	const getStepContent = () => {
		// Debug logging removed to prevent infinite loops

		if (stepData.state === null) {
			if (alreadyScannedCount === scannableChannels.length) {
				return (
					<div className="space-y-2">
						<p className="text-muted-foreground text-sm">
							All scannable channels have already been scanned,
							skipping initial scan.
						</p>
						<div className="text-sm">
							<span className="font-semibold">
								{alreadyScannedCount}
							</span>{" "}
							/ {scannableChannels.length} channels already
							scanned
						</div>
						{serverChannels.length > scannableChannels.length && (
							<div className="text-muted-foreground text-xs">
								(
								{serverChannels.length -
									scannableChannels.length}{" "}
								category channels ignored)
							</div>
						)}
						{shouldStart && (
							<div className="mt-2 text-xs text-blue-600">
								Ready to skip initial scan...
							</div>
						)}
					</div>
				);
			} else if (alreadyScannedCount > 0) {
				return (
					<div className="space-y-2">
						<p className="text-muted-foreground text-sm">
							We&apos;ll scan the remaining channels to complete
							the initial database setup.
						</p>
						<div className="text-sm">
							<span className="font-semibold">
								{alreadyScannedCount}
							</span>{" "}
							/ {scannableChannels.length} channels already
							scanned
						</div>
						<div className="text-muted-foreground space-y-1 text-xs">
							<div>
								• Scan {channelsNeedingScans.length} remaining
								channels for clips
							</div>
							<div>• Process up to 500 messages per channel</div>
							<div>• Complete initial clip database</div>
							{serverChannels.length >
								scannableChannels.length && (
								<div>
									• Category channels automatically ignored
								</div>
							)}
						</div>
						{shouldStart && (
							<div className="mt-2 text-xs text-blue-600">
								Ready to start remaining scans...
							</div>
						)}
					</div>
				);
			} else {
				return (
					<div className="space-y-2">
						<p className="text-muted-foreground text-sm">
							We&apos;ll scan all channels to discover existing
							clips and set up the initial database.
						</p>
						<div className="text-muted-foreground space-y-1 text-xs">
							<div>
								• Scan {scannableChannels.length} channels for
								clips
							</div>
							<div>• Process up to 500 messages per channel</div>
							<div>• Build initial clip database</div>
							{serverChannels.length >
								scannableChannels.length && (
								<div>
									• Category channels automatically ignored
								</div>
							)}
						</div>
						{shouldStart && (
							<div className="mt-2 text-xs text-blue-600">
								Ready to start initial scan...
							</div>
						)}
					</div>
				);
			}
		}

		if (stepData.state === "loading") {
			if (!scanStarted) {
				const channelsToScan =
					channelsNeedingScans.length || scannableChannels.length;
				return (
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Starting initial scan...
						</p>
						<div className="text-muted-foreground text-xs">
							Preparing to scan {channelsToScan} channels...
						</div>
						{alreadyScannedCount > 0 && (
							<div className="text-muted-foreground text-xs">
								({alreadyScannedCount} channels already scanned)
							</div>
						)}
						{serverChannels.length > scannableChannels.length && (
							<div className="text-muted-foreground text-xs">
								(
								{serverChannels.length -
									scannableChannels.length}{" "}
								category channels ignored)
							</div>
						)}
					</div>
				);
			}

			return (
				<div className="space-y-3">
					<p className="text-sm font-medium">
						Initial scan in progress...
					</p>

					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Queued:
								</span>
								<span className="font-medium">
									{scanStats.queued}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Running:
								</span>
								<span className="font-medium text-blue-600">
									{scanStats.running}
								</span>
							</div>
						</div>
						<div className="space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Completed:
								</span>
								<span className="font-medium text-green-600">
									{scanStats.completed}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Failed:
								</span>
								<span className="font-medium text-red-600">
									{scanStats.failed}
								</span>
							</div>
						</div>
					</div>

					<div className="h-2 w-full rounded-full bg-gray-200">
						<div
							className="h-2 rounded-full bg-blue-600 transition-all duration-300"
							style={{
								width: `${
									scanStats.total > 0
										? ((scanStats.completed +
												scanStats.failed) /
												scanStats.total) *
											100
										: 0
								}%`,
							}}
						/>
					</div>

					<div className="text-muted-foreground text-xs">
						Progress: {scanStats.completed + scanStats.failed} /{" "}
						{scanStats.total} channels
					</div>
				</div>
			);
		}

		if (stepData.state === "success") {
			const totalProcessed = scanStats.total + alreadyScannedCount;
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-green-600">
						Initial scan completed successfully!
					</p>
					<div className="text-sm">
						{alreadyScannedCount > 0 ? (
							<>
								<span className="font-semibold">
									{totalProcessed}
								</span>{" "}
								channels processed ({scanStats.total} scanned,{" "}
								{alreadyScannedCount} already done)
							</>
						) : (
							<>
								Scanned{" "}
								<span className="font-semibold">
									{scanStats.total}
								</span>{" "}
								channels successfully.
							</>
						)}
					</div>
					<div className="text-muted-foreground text-xs">
						Your clip database is now ready for use.
					</div>
				</div>
			);
		}

		if (stepData.state === "need_action") {
			return (
				<div className="space-y-3">
					<p className="text-sm font-medium text-yellow-600">
						Some channels failed to scan
					</p>

					<div className="text-sm">
						<span className="font-semibold text-green-600">
							{scanStats.completed}
						</span>{" "}
						succeeded,{" "}
						<span className="font-semibold text-red-600">
							{scanStats.failed}
						</span>{" "}
						failed
					</div>

					{failedScans.length > 0 && (
						<div className="space-y-2">
							<div className="text-xs font-medium">
								Failed channels:
							</div>
							<div className="max-h-32 space-y-1 overflow-y-auto">
								{failedScans.map((scan) => (
									<div
										key={scan.channel_id}
										className="rounded bg-red-50 p-2 text-xs"
									>
										<div className="font-medium">
											#{getChannelName(scan.channel_id)}
										</div>
										{scan.error_message && (
											<div className="mt-1 text-red-600">
												{scan.error_message}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<div className="flex gap-2">
						<Button
							onClick={retryFailedScans}
							disabled={startBulkScanMutation.isPending}
							size="sm"
						>
							Retry Failed Channels
						</Button>
						<Button
							onClick={() => {
								markInitialScanCompleted();
								completeStep("initial_scan");
								setTimeout(() => onComplete(), 500);
							}}
							variant="outline"
							size="sm"
						>
							Continue Anyway
						</Button>
					</div>
				</div>
			);
		}

		if (stepData.state === "error") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-red-600">
						Failed to start initial scan
					</p>
					{stepData.error && (
						<div className="rounded bg-red-50 p-2 text-xs text-red-500">
							{stepData.error}
						</div>
					)}
					<Button
						onClick={() => {
							setScanStarted(false);
							startStep("initial_scan");
						}}
						disabled={startBulkScanMutation.isPending}
						size="sm"
					>
						Retry
					</Button>
				</div>
			);
		}

		return null;
	};

	return (
		<Step title="Initial Scan" state={stepData.state}>
			{getStepContent()}
		</Step>
	);
}
