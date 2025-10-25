"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    scanStatusesQuery,
    scanStatusQuery,
    scanKeys,
    optimisticStartScan,
    optimisticStartBulkScan,
} from "../queries/scan";
import {
    startSingleScan,
    startBulkScan,
    type StartScanOptions,
    MultiScanResult,
    ScanResult,
} from "../api/scan";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch scan statuses for all channels in a guild.
 *
 * Features:
 * - Automatic polling every 3 seconds when any scans are RUNNING or QUEUED
 * - Stops polling when all scans are completed/failed/cancelled
 * - Real-time status updates without manual refresh
 *
 * @param guildId - The guild ID
 *
 * @example
 * ```tsx
 * function ScansPanel({ guildId }: { guildId: string }) {
 *   const { data, isLoading } = useScanStatuses(guildId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {data?.map(status => (
 *         <div key={status.channel_id}>
 *           {status.status} - {status.total_messages_scanned} messages
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScanStatuses(guildId: string) {
    return useQuery(scanStatusesQuery(guildId));
}

/**
 * Fetch scan status for a single channel.
 *
 * @param guildId - The guild ID
 * @param channelId - The channel ID
 *
 * @example
 * ```tsx
 * function ChannelScanStatus({ guildId, channelId }: Props) {
 *   const { data: status, isLoading } = useChannelScanStatus(guildId, channelId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!status) return <div>No scan data</div>;
 *
 *   return <div>Status: {status.status}</div>;
 * }
 * ```
 */
export function useChannelScanStatus(guildId: string, channelId: string) {
    return useQuery(scanStatusQuery(guildId, channelId));
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Start a scan for a single channel.
 *
 * Features:
 * - Optimistic update: immediately shows QUEUED status
 * - Automatic rollback on error
 * - Invalidates cache on success to fetch real server state
 *
 * @param guildId - The guild ID
 *
 * @example
 * ```tsx
 * function StartScanButton({ guildId, channelId }: Props) {
 *   const startScan = useStartScan(guildId);
 *
 *   const handleStart = () => {
 *     startScan.mutate({
 *       channelId,
 *       options: { isUpdate: false, limit: 100 }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleStart} disabled={startScan.isPending}>
 *       Start Scan
 *     </button>
 *   );
 * }
 * ```
 */
export function useStartScan(guildId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
            channelId,
            options,
        }: {
            channelId: string;
            options?: StartScanOptions;
        }) => startSingleScan(guildId, channelId, options),

        onMutate: async ({ channelId }) => {
            // Stop any in-flight refetches of scan statuses
            await qc.cancelQueries({
                queryKey: scanKeys.statuses(guildId),
            });

            // Optimistically update to QUEUED status
            const snapshot = optimisticStartScan(qc, guildId, channelId);

            return { snapshot };
        },

        onError: (_err, _payload, ctx) => {
            console.error("Failed to start scan:", _err);

            // Roll back if we had a snapshot
            const prev = ctx?.snapshot?.prev;
            if (prev) qc.setQueryData(scanKeys.statuses(guildId), prev);
        },

        onSettled: () => {
            // Revalidate canonical data
            qc.invalidateQueries({
                queryKey: scanKeys.statuses(guildId),
            });
        },
    });
}

/**
 * Start scans for multiple channels (bulk operation).
 *
 * Features:
 * - Starts scans for all specified channels
 * - Invalidates cache on completion
 * - Returns success/failure counts
 *
 * @param guildId - The guild ID
 *
 * @example
 * ```tsx
 * function BulkScanButton({ guildId, channelIds }: Props) {
 *   const bulkScan = useStartBulkScan(guildId);
 *
 *   const handleStart = () => {
 *     bulkScan.mutate({
 *       channelIds,
 *       options: { isUpdate: true, limit: 100 }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleStart} disabled={bulkScan.isPending}>
 *       Start Bulk Scan
 *     </button>
 *   );
 * }
 * ```
 */
export function useStartBulkScan(guildId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
            channelIds,
            options,
        }: {
            channelIds: string[];
            options?: StartScanOptions;
        }) => startBulkScan(guildId, channelIds, options),

        onMutate: async ({ channelIds }) => {
            // Stop any in-flight refetches of scan statuses
            await qc.cancelQueries({
                queryKey: scanKeys.statuses(guildId),
            });

            // Optimistically update all channels to QUEUED status
            const snapshot = optimisticStartBulkScan(qc, guildId, channelIds);

            return { snapshot };
        },

        onError: (_err, _payload, ctx) => {
            console.error("Failed to start bulk scan:", _err);

            // Roll back if we had a snapshot
            const prev = ctx?.snapshot?.prev;
            if (prev) qc.setQueryData(scanKeys.statuses(guildId), prev);
        },

        onSettled: () => {
            // Revalidate canonical data
            qc.invalidateQueries({
                queryKey: scanKeys.statuses(guildId),
            });
        },
    });
}

export function useStartCustomScan(guildId: string) {
    const startScanMutation = useStartScan(guildId);

    const DEFAULTS: StartScanOptions = {
        isUpdate: true,
        limit: 100,
        autoContinue: true,
        rescan: "stop",
    };

    function start(
        channelId: string,
        options?: Partial<StartScanOptions>,
        callbacks?: {
            onSuccess?: (result: ScanResult) => void;
            onError?: (err: unknown) => void;
            onSettled?: () => void;
        }
    ) {
        const merged = { ...DEFAULTS, ...(options ?? {}) };

        startScanMutation.mutate(
            {
                channelId,
                options: merged,
            },
            callbacks
        );
    }

    return { start, isPending: startScanMutation.isPending };
}
