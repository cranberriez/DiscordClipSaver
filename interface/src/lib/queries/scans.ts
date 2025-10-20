// ============================================================================
// Query Keys Factory
// ============================================================================

import { queryOptions, QueryClient } from "@tanstack/react-query";
import { ScanStatus } from "../api/scan";
import { getScanStatuses, getScanStatus } from "../api/scan";

export const scanKeys = {
    all: ["scans"] as const,
    statuses: (guildId: string) =>
        [...scanKeys.all, "scanStatuses", guildId] as const,
    status: (guildId: string, channelId: string) =>
        [...scanKeys.all, "scanStatus", guildId, channelId] as const,
};

// ============================================================================
// Queries
// ============================================================================

export const scanStatusesQuery = (guildId: string) =>
    queryOptions<ScanStatus[]>({
        queryKey: scanKeys.statuses(guildId),
        queryFn: () => getScanStatuses(guildId),
        enabled: !!guildId,
        staleTime: 60_000,
    });

export const scanStatusQuery = (guildId: string, channelId: string) =>
    queryOptions<ScanStatus | null>({
        queryKey: scanKeys.status(guildId, channelId),
        queryFn: () => getScanStatus(guildId, channelId),
        enabled: !!guildId && !!channelId,
        staleTime: 60_000,

        refetchInterval: query => {
            const data = query.state.data as ScanStatus | null;
            const status = data?.status;
            const hasRunningScans =
                status === "RUNNING" || status === "PENDING";
            // Poll every 5 seconds if scans are running, otherwise don't poll
            return hasRunningScans ? 5000 : false;
        },
    });

// ============================================================================
// Optimistic Updates
// ============================================================================

/**
 * Optimistically update scan status to PENDING when starting a scan.
 * Returns snapshot for rollback on error.
 */
export function optimisticStartScan(
    qc: QueryClient,
    guildId: string,
    channelId: string
) {
    const key = scanKeys.statuses(guildId);
    const prev = qc.getQueryData<ScanStatus[]>(key);
    if (!prev) return { prev };

    const statuses = prev;
    const existingIndex = statuses.findIndex(s => s.channel_id === channelId);

    const optimisticStatus: ScanStatus = {
        channel_id: channelId,
        guild_id: guildId,
        status: "PENDING",
        message_count:
            existingIndex >= 0 ? statuses[existingIndex].message_count : 0,
        total_messages_scanned:
            existingIndex >= 0
                ? statuses[existingIndex].total_messages_scanned
                : 0,
        forward_message_id:
            existingIndex >= 0
                ? statuses[existingIndex].forward_message_id
                : null,
        backward_message_id:
            existingIndex >= 0
                ? statuses[existingIndex].backward_message_id
                : null,
        created_at:
            existingIndex >= 0
                ? statuses[existingIndex].created_at
                : new Date(),
        updated_at: new Date(),
        error_message: null,
        deleted_at: null,
    };

    const optimistic: ScanStatus[] =
        existingIndex >= 0
            ? [
                  ...statuses.slice(0, existingIndex),
                  optimisticStatus,
                  ...statuses.slice(existingIndex + 1),
              ]
            : [...statuses, optimisticStatus];

    qc.setQueryData(key, optimistic);

    return { prev };
}
