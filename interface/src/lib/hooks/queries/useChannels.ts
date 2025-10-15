'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { guildKeys } from './useGuilds';
import type { Channel } from '@/lib/db/types';

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
