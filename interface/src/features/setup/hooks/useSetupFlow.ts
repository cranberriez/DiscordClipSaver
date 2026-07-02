"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Guild } from "@/lib/api/guild";
import type { Channel } from "@/lib/api/channel";
import type { ScanStatus } from "@/lib/api/scan";
import {
	useGuild,
	useChannels,
	useToggleScanning,
	useBulkUpdateChannels,
	useStartBulkScan,
	useScanStatuses,
} from "@/lib/hooks";
import type { SetupStepState } from "../steps/types";

export type SetupStepId =
	| "discover_channels"
	| "enable_scanning"
	| "initial_scan"
	| "complete";

export interface StepStatus {
	state: SetupStepState;
	error?: string;
}

export interface ScanStats {
	queued: number;
	running: number;
	completed: number;
	failed: number;
	total: number;
}

export interface SetupFlow {
	guild: Guild;
	currentStep: SetupStepId;
	isComplete: boolean;
	completedStepsCount: number;
	totalStepsCount: number;

	discover: StepStatus & {
		channelCount: number;
		isFetching: boolean;
		retry: () => void;
	};

	enable: StepStatus & {
		currentTask: string;
		isPending: boolean;
		retry: () => void;
	};

	scan: StepStatus & {
		stats: ScanStats;
		failedScans: ScanStatus[];
		scannableCount: number;
		alreadyScannedCount: number;
		missingCount: number;
		isPending: boolean;
		scanStarted: boolean;
		getChannelName: (channelId: string) => string;
		retryFailed: () => void;
		retryMissing: () => void;
		continueAnyway: () => void;
	};
}

const ACTIVE_SCAN_STATES = ["QUEUED", "RUNNING"];

/**
 * Single source of truth for the setup wizard.
 *
 * All step completion is DERIVED from live server state (react-query):
 * - discover_channels: the guild has channels in the DB
 * - enable_scanning:   guild.message_scan_enabled is true (live query, not the
 *                      static server-render prop - this is what previously
 *                      caused the infinite reset loop)
 * - initial_scan:      every scannable (non-category) channel has a scan
 *                      status, and none are queued/running
 *
 * Nothing is persisted client-side (no zustand persist, no localStorage), so
 * there is no hydration dance and no state that can drift from the server.
 *
 * Auto-run actions (enable scanning, start initial scan) fire at most once
 * per mount, guarded by refs. If they fail, the step shows an error with an
 * explicit retry - it never self-restarts.
 */
export function useSetupFlow(initialGuild: Guild): SetupFlow {
	// Live guild data: updates via query invalidation when scanning is toggled
	const { data: liveGuild } = useGuild(initialGuild.id, {
		initialData: initialGuild,
	});
	const guild = liveGuild ?? initialGuild;

	const channelsQuery = useChannels(guild.id);
	const scanStatusesQuery = useScanStatuses(guild.id);

	const toggleScanning = useToggleScanning(guild.id);
	const bulkUpdateChannels = useBulkUpdateChannels(guild.id);
	const startBulkScan = useStartBulkScan(guild.id);

	const channels: Channel[] = useMemo(
		() => channelsQuery.data ?? [],
		[channelsQuery.data]
	);
	const scanStatuses: ScanStatus[] = useMemo(
		() => scanStatusesQuery.data ?? [],
		[scanStatusesQuery.data]
	);

	// =========================================================================
	// Step 1: Discover channels (fully derived, no actions besides refetch)
	// =========================================================================
	const discoverStatus: StepStatus = channelsQuery.isError
		? { state: "error", error: "Failed to fetch channels from Discord" }
		: channelsQuery.isPending
			? { state: "loading" }
			: channels.length > 0
				? { state: "success" }
				: {
						state: "need_action",
						error: "No channels found in this server",
					};

	const discoverDone = discoverStatus.state === "success";

	// =========================================================================
	// Step 2: Enable scanning (auto-runs once when discover is done)
	// =========================================================================
	const enableAttempted = useRef(false);
	const [enableError, setEnableError] = useState<string | null>(null);
	const [enableTask, setEnableTask] = useState("");

	const enableDone = !!guild.message_scan_enabled;
	const enablePending =
		toggleScanning.isPending || bulkUpdateChannels.isPending;

	const runEnableScanning = async () => {
		enableAttempted.current = true;
		setEnableError(null);
		try {
			setEnableTask("Enabling scanning for guild...");
			await toggleScanning.mutateAsync(true);
			setEnableTask("Enabling scanning for all channels...");
			await bulkUpdateChannels.mutateAsync(true);
			setEnableTask("Scanning enabled!");
		} catch (error) {
			setEnableError(
				error instanceof Error
					? error.message
					: "Failed to enable scanning"
			);
		}
	};

	useEffect(() => {
		if (
			discoverDone &&
			!enableDone &&
			!enableAttempted.current &&
			!enablePending
		) {
			void runEnableScanning();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [discoverDone, enableDone]);

	const enableStatus: StepStatus = enableDone
		? { state: "success" }
		: enableError
			? { state: "error", error: enableError }
			: enablePending
				? { state: "loading" }
				: { state: null };

	// =========================================================================
	// Step 3: Initial scan (auto-starts once for channels without any status)
	// =========================================================================
	const scanAttempted = useRef(false);
	const [scanError, setScanError] = useState<string | null>(null);
	const [failuresDismissed, setFailuresDismissed] = useState(false);

	const scannableChannels = useMemo(
		() => channels.filter((c) => c.type !== "category"),
		[channels]
	);

	const statusedChannelIds = useMemo(
		() => new Set(scanStatuses.map((s) => s.channel_id)),
		[scanStatuses]
	);

	const missingChannels = useMemo(
		() => scannableChannels.filter((c) => !statusedChannelIds.has(c.id)),
		[scannableChannels, statusedChannelIds]
	);

	const stats: ScanStats = useMemo(
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

	const failedScans = useMemo(
		() => scanStatuses.filter((s) => s.status === "FAILED"),
		[scanStatuses]
	);

	const hasActiveScans = scanStatuses.some((s) =>
		ACTIVE_SCAN_STATES.includes(s.status)
	);

	const scanDataReady =
		!channelsQuery.isPending && !scanStatusesQuery.isPending;

	const startScanFor = (channelIds: string[]) => {
		scanAttempted.current = true;
		setScanError(null);
		startBulkScan.mutate(
			{
				channelIds,
				options: {
					isUpdate: false, // Start from newest message
					autoContinue: false,
					rescan: "stop", // Stop on duplicates
				},
			},
			{
				onError: () => setScanError("Failed to start initial scan"),
			}
		);
	};

	// Auto-start: only once per mount, only when the enable step is genuinely
	// done (live server state) and only for channels with no scan history.
	useEffect(() => {
		if (
			!enableDone ||
			!scanDataReady ||
			scanAttempted.current ||
			startBulkScan.isPending ||
			missingChannels.length === 0 ||
			hasActiveScans
		) {
			return;
		}
		startScanFor(missingChannels.map((c) => c.id));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enableDone, scanDataReady, missingChannels.length, hasActiveScans]);

	const allChannelsHaveStatus =
		scanDataReady && missingChannels.length === 0;
	const scanFinished = allChannelsHaveStatus && !hasActiveScans;
	const scanDone =
		scanFinished && (stats.failed === 0 || failuresDismissed);

	const scanStatus: StepStatus = !enableDone
		? { state: null }
		: scanError
			? { state: "error", error: scanError }
			: scanDone
				? { state: "success" }
				: scanFinished && stats.failed > 0
					? {
							state: "need_action",
							error: `${stats.failed} channels failed to scan`,
						}
					: !scanDataReady ||
						  hasActiveScans ||
						  startBulkScan.isPending ||
						  scanAttempted.current
						? { state: "loading" }
						: // Data ready, channels missing, auto-start hasn't fired yet
							{ state: null };

	const getChannelName = (channelId: string) =>
		channels.find((c) => c.id === channelId)?.name || "Unknown";

	// =========================================================================
	// Overall flow
	// =========================================================================
	const stepStates: Array<[SetupStepId, boolean]> = [
		["discover_channels", discoverDone],
		["enable_scanning", enableDone],
		["initial_scan", scanDone],
	];
	const completedStepsCount = stepStates.filter(([, done]) => done).length;
	const firstIncomplete = stepStates.find(([, done]) => !done);
	const currentStep: SetupStepId = firstIncomplete
		? firstIncomplete[0]
		: "complete";

	return {
		guild,
		currentStep,
		isComplete: currentStep === "complete",
		completedStepsCount,
		totalStepsCount: stepStates.length,

		discover: {
			...discoverStatus,
			channelCount: channels.length,
			isFetching: channelsQuery.isFetching,
			retry: () => void channelsQuery.refetch(),
		},

		enable: {
			...enableStatus,
			currentTask: enableTask,
			isPending: enablePending,
			retry: () => void runEnableScanning(),
		},

		scan: {
			...scanStatus,
			stats,
			failedScans,
			scannableCount: scannableChannels.length,
			alreadyScannedCount:
				scannableChannels.length - missingChannels.length,
			missingCount: missingChannels.length,
			isPending: startBulkScan.isPending,
			scanStarted: scanAttempted.current || stats.total > 0,
			getChannelName,
			retryFailed: () =>
				startScanFor(failedScans.map((s) => s.channel_id)),
			retryMissing: () =>
				startScanFor(missingChannels.map((c) => c.id)),
			continueAnyway: () => setFailuresDismissed(true),
		},
	};
}
