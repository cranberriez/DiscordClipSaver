'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { guildKeys } from './useGuilds';
import type { Channel } from '@/lib/db/types';
import type { ChannelWithStats } from '@/lib/api/types';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all channels for a guild.
 * 
 * @param guildId - The guild ID
 * @param initialData - Optional initial data from Server Component
 * 
 * @example
 * ```tsx
 * function ChannelsList({ guildId }: { guildId: string }) {
 *   const { data, isLoading } = useChannels(guildId);
 *   
 *   if (isLoading) return <div>Loading channels...</div>;
 *   
 *   return (
 *     <ul>
 *       {data?.channels.map(channel => (
 *         <li key={channel.id}>{channel.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useChannels(guildId: string, initialData?: Channel[]) {
    return useQuery({
        queryKey: guildKeys.channels(guildId),
        queryFn: () => api.channels.list(guildId),
        enabled: !!guildId,
        initialData: initialData ? { channels: initialData } : undefined,
        // Don't refetch if we have initial data from server
        staleTime: initialData ? Infinity : 60 * 1000,
        // Transform to just return channels array for easier use
        select: (data) => data.channels,
    });
}

/**
 * Fetch channel statistics (with clip counts) for a guild.
 * 
 * Useful for analytics, dashboards, purge operations, etc.
 * This is separate from `useChannels` to allow different caching strategies.
 * 
 * @param guildId - The guild ID
 * 
 * @example
 * ```tsx
 * function ChannelStats({ guildId }: { guildId: string }) {
 *   const { data: channels, isLoading } = useChannelStats(guildId);
 *   
 *   if (isLoading) return <div>Loading stats...</div>;
 *   
 *   const totalClips = channels?.reduce((sum, ch) => sum + ch.clip_count, 0) ?? 0;
 *   
 *   return (
 *     <div>
 *       {channels?.map(channel => (
 *         <div key={channel.id}>
 *           {channel.name}: {channel.clip_count} clips
 *         </div>
 *       ))}
 *       <div>Total: {totalClips} clips</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChannelStats(guildId: string) {
    return useQuery({
        queryKey: guildKeys.channelStats(guildId),
        queryFn: () => api.channels.stats(guildId),
        enabled: !!guildId,
        staleTime: 1000 * 60 * 2, // Consider fresh for 2 minutes
    });
}

/**
 * Get total clip count across all channels for a guild.
 * Convenience hook that uses `useChannelStats` under the hood.
 * 
 * @param guildId - The guild ID
 * @returns Total clip count across all channels
 */
export function useTotalClipCount(guildId: string): number {
    const { data: channels } = useChannelStats(guildId);
    return channels?.reduce((sum, ch) => sum + ch.clip_count, 0) ?? 0;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Bulk enable/disable all channels for a guild.
 * 
 * @example
 * ```tsx
 * function BulkChannelToggle({ guildId }: { guildId: string }) {
 *   const bulkUpdate = useBulkUpdateChannels(guildId);
 *   
 *   const handleEnableAll = () => {
 *     bulkUpdate.mutate(true);
 *   };
 *   
 *   return (
 *     <button 
 *       onClick={handleEnableAll}
 *       disabled={bulkUpdate.isPending}
 *     >
 *       Enable All Channels
 *     </button>
 *   );
 * }
 * ```
 */
export function useBulkUpdateChannels(guildId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (enabled: boolean) => api.channels.bulkUpdate(guildId, enabled),

        // Optimistic update
        onMutate: async (enabled) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: guildKeys.channels(guildId) });

            // Snapshot previous value - the cache stores { channels: [...] } before select transform
            const previousData = queryClient.getQueryData<{ channels: Channel[] }>(
                guildKeys.channels(guildId)
            );

            // Optimistically update all channels
            if (previousData?.channels) {
                queryClient.setQueryData<{ channels: Channel[] }>(
                    guildKeys.channels(guildId),
                    {
                        channels: previousData.channels.map(channel => ({
                            ...channel,
                            message_scan_enabled: enabled,
                        }))
                    }
                );
            }

            return { previousData };
        },

        // Rollback on error
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(
                    guildKeys.channels(guildId),
                    context.previousData
                );
            }
        },

        // Refetch on success
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: guildKeys.channels(guildId) });
        },
    });
}
