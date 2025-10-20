"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    scanStatusesQuery,
    scanStatusQuery,
    scanKeys,
    optimisticStartScan,
} from "../queries/scans";
import { startScan } from "../api/scan";
import { BatchScanJob } from "../redis";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch scan statuses for all channels in a guild.
 *
 * Features:
 * - Automatic polling when scans are running
 * - Stops polling when all scans complete
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
 * Start a scan for a channel using the server action.
 *
 * Features:
 * - Optimistic update: immediately shows PENDING status
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
        mutationFn: (payload: BatchScanJob) => startScan(guildId, payload),

        onMutate: async ({ channel_id }) => {
            // Stop any in-flight refetches of scan statuses
            await qc.cancelQueries({
                queryKey: scanKeys.statuses(guildId),
            });

            // Optimistically update to PENDING status
            const snapshot = optimisticStartScan(qc, guildId, channel_id);

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
