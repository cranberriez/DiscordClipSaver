"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/react-query/client";
import { guildKeys } from "./useGuilds";
import { startChannelScan } from "@/lib/actions/scan";
import type { ChannelScanStatus } from "@/lib/db/types";

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
    return useQuery({
        queryKey: guildKeys.scanStatuses(guildId),
        queryFn: () => api.scans.statuses(guildId),
        enabled: !!guildId,
        // Transform to just return statuses array
        select: data => data.statuses,
        // Smart polling: only poll when scans are running
        refetchInterval: query => {
            // query.state.data is the raw API response before select transform
            const data = query.state.data as
                | { statuses: ChannelScanStatus[] }
                | undefined;
            const statuses = data?.statuses;
            const hasRunningScans = statuses?.some(
                s => s.status === "RUNNING" || s.status === "PENDING"
            );
            // Poll every 5 seconds if scans are running, otherwise don't poll
            return hasRunningScans ? 5000 : false;
        },
    });
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
    return useQuery({
        queryKey: [...guildKeys.scanStatuses(guildId), channelId],
        queryFn: () => api.scans.status(guildId, channelId),
        enabled: !!guildId && !!channelId,
        // Transform to just return status
        select: data => data.status,
        // Poll if scan is running
        refetchInterval: query => {
            // query.state.data is the raw API response before select transform
            const data = query.state.data as
                | { status: ChannelScanStatus | null }
                | undefined;
            const status = data?.status;
            const isRunning =
                status?.status === "RUNNING" || status?.status === "PENDING";
            return isRunning ? 5000 : false;
        },
    });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Start a scan for a channel using the server action.
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
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            channelId,
            options,
        }: {
            channelId: string;
            options?: {
                isUpdate?: boolean;
                isHistorical?: boolean;
                limit?: number;
                autoContinue?: boolean;
                rescan?: "stop" | "continue" | "update";
            };
        }) => {
            const result = await startChannelScan(guildId, channelId, options);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        },

        // Optimistic update: immediately show PENDING status
        onMutate: async ({ channelId }) => {
            // Cancel any outgoing refetches to avoid overwriting our optimistic update
            await queryClient.cancelQueries({
                queryKey: guildKeys.scanStatuses(guildId),
            });

            // Snapshot the previous value
            const previousStatuses = queryClient.getQueryData(
                guildKeys.scanStatuses(guildId)
            );

            // Optimistically update the cache
            queryClient.setQueryData(
                guildKeys.scanStatuses(guildId),
                (old: any) => {
                    if (!old?.statuses) return old;

                    const statuses = old.statuses as ChannelScanStatus[];
                    const existingIndex = statuses.findIndex(
                        s => s.channel_id === channelId
                    );

                    const optimisticStatus: ChannelScanStatus = {
                        channel_id: channelId,
                        guild_id: guildId,
                        status: "PENDING",
                        message_count:
                            existingIndex >= 0
                                ? statuses[existingIndex].message_count
                                : 0,
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
                    };

                    if (existingIndex >= 0) {
                        // Update existing status
                        const newStatuses = [...statuses];
                        newStatuses[existingIndex] = optimisticStatus;
                        return { ...old, statuses: newStatuses };
                    } else {
                        // Add new status
                        return {
                            ...old,
                            statuses: [...statuses, optimisticStatus],
                        };
                    }
                }
            );

            // Return context with previous value for rollback on error
            return { previousStatuses };
        },

        // Invalidate scan statuses after starting a scan to get real server state
        onSuccess: () => {
            // Invalidate to refetch the actual server state
            queryClient.invalidateQueries({
                queryKey: guildKeys.scanStatuses(guildId),
            });
        },

        // Rollback on error
        onError: (error, variables, context) => {
            console.error("Failed to start scan:", error);

            // Rollback to previous state
            if (context?.previousStatuses) {
                queryClient.setQueryData(
                    guildKeys.scanStatuses(guildId),
                    context.previousStatuses
                );
            }
        },
    });
}
