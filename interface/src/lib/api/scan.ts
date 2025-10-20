// ============================================================================
// Scan Status API Responses
// ============================================================================

import type { BatchScanJob } from "../redis";
import { api } from "./client";
import { startChannelScan } from "@/lib/actions/scan";

export type StatusEnum =
    | "PENDING"
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
 * Response from startChannelScan server action
 */
export type ScanResult =
    | { success: true; jobId: string; messageId: string }
    | { success: false; error: string };

/**
 * Response from startMultipleChannelScans server action
 */
export interface MultiScanResult {
    success: number;
    failed: number;
    results: Array<{ channelId: string; result: ScanResult }>;
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

export async function startScan(
    guildId: string,
    payload: BatchScanJob
): Promise<ScanResult> {
    const result = await startChannelScan(guildId, payload.channel_id, payload);

    if (!result.success) {
        throw new Error(result.error);
    }

    return result;
}
