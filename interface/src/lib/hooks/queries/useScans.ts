'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { guildKeys } from './useGuilds';
import { startChannelScan } from '@/lib/actions/scan';
import type { ChannelScanStatus } from '@/lib/db/types';

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
        select: (data) => data.statuses,
        // Smart polling: only poll when scans are running
        refetchInterval: (query) => {
            const statuses = query.state.data as ChannelScanStatus[] | undefined;
            const hasRunningScans = statuses?.some(
                (s) => s.status === 'RUNNING' || s.status === 'PENDING'
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
        select: (data) => data.status,
        // Poll if scan is running
        refetchInterval: (query) => {
            const status = query.state.data as ChannelScanStatus | null | undefined;
            const isRunning = status?.status === 'RUNNING' || status?.status === 'PENDING';
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
 *       options: { direction: 'backward', limit: 100 }
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
                direction?: 'forward' | 'backward';
                limit?: number;
                autoContinue?: boolean;
            };
        }) => {
            const result = await startChannelScan(guildId, channelId, options);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return result;
        },

        // Invalidate scan statuses after starting a scan
        onSuccess: () => {
            // Invalidate to refetch immediately
            queryClient.invalidateQueries({ queryKey: guildKeys.scanStatuses(guildId) });
        },

        onError: (error) => {
            console.error('Failed to start scan:', error);
        },
    });
}
