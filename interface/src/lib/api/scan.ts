// ============================================================================
// Scan Status API Responses
// ============================================================================

import { api } from "./client";

export type StatusEnum =
	| "QUEUED"
	| "RUNNING"
	| "SUCCEEDED"
	| "FAILED"
	| "CANCELLED";

/**
 * Scan Status DTO as returned by the API
 */
export interface ScanStatus {
	guild_id: string;
	channel_id: string;
	status: StatusEnum;
	message_count: number;
	total_messages_scanned: number;
	forward_message_id: string | null;
	backward_message_id: string | null;
	error_message: string | null;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
}

/**
 * Options for starting a scan
 */
export interface StartScanOptions {
	isUpdate?: boolean; // If true, always scan forward from last position
	isHistorical?: boolean; // If true, force backward scan from beginning
	isBackfill?: boolean; // If true, scan backward from oldest known message
	autoContinue?: boolean;
	rescan?: "stop" | "continue" | "update"; // How to handle already-processed messages
}

/**
 * Response from startChannelScan server action
 */
export type ScanResult =
	| { success: true; jobId: string; messageId: string }
	| { success: false; error: string };

/**
 * Response from start scans API endpoint
 */
export interface MultiScanResult {
	success: number;
	failed: number;
	results: Array<{
		channelId: string;
		success: boolean;
		jobId?: string;
		messageId?: string;
		error?: string;
	}>;
}

// ========================================================================
// Scan Actions
// ========================================================================

export function getScanStatuses(guildId: string): Promise<ScanStatus[]> {
	return api.scans.statuses(guildId);
}

export function getScanStatus(
	guildId: string,
	channelId: string
): Promise<ScanStatus | null> {
	return api.scans.status(guildId, channelId);
}

/**
 * Start a scan for a single channel
 */
export async function startSingleScan(
	guildId: string,
	channelId: string,
	options?: StartScanOptions
): Promise<ScanResult> {
	const response = await api.scans.start(guildId, channelId, options);

	if (!response.success) {
		console.error(response.error);
	}

	return response;
}

/**
 * Start scans for multiple channels
 */
export async function startBulkScan(
	guildId: string,
	channelIds: string[],
	options?: StartScanOptions
): Promise<MultiScanResult> {
	const response = await api.scans.startBulk(guildId, channelIds, options);

	if (response.failed > 0) {
		console.error(`Failed to start ${response.failed} scans`);
	}

	return response;
}

/**
 * Cancel a scan for a specific channel
 */
export async function cancelScan(
	guildId: string,
	channelId: string
): Promise<{ success: boolean; scan?: ScanStatus; error?: string }> {
	try {
		const response = await fetch(`/api/guilds/${guildId}/scans/cancel`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ channelId }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			return {
				success: false,
				error: errorData.error || "Failed to cancel scan",
			};
		}

		const data = await response.json();
		return { success: true, scan: data.scan };
	} catch (error) {
		console.error("Cancel scan error:", error);
		return { success: false, error: "Network error" };
	}
}
