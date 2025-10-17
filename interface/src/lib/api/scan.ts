// ============================================================================
// Scan Status API Responses
// ============================================================================

import type { ChannelScanStatus } from "@/lib/redis";
import { api } from "./client";

/**
 * Response from GET /api/guilds/[guildId]/scan-statuses
 */
export interface ScanStatusesResponse {
    statuses: ChannelScanStatus[];
}

/**
 * Response from GET /api/guilds/[guildId]/channels/[channelId]/scan-status
 */
export interface SingleScanStatusResponse {
    status: ChannelScanStatus | null;
}

// ========================================================================
// Scan Actions
// ========================================================================

export function getScanStatuses(
    guildId: string
): Promise<ScanStatusesResponse> {
    return api.scans.statuses(guildId);
}

export function getScanStatus(
    guildId: string,
    channelId: string
): Promise<SingleScanStatusResponse> {
    return api.scans.status(guildId, channelId);
}
