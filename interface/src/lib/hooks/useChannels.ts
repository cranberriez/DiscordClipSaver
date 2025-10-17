"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { guildKeys } from "@/lib/queries";
import type { Channel } from "@/lib/db/types";
import {
    channelKeys,
    channelStatsByGuildQuery,
    guildChannelsQuery,
    optimisticBulkUpdateChannels,
} from "../queries/channels";

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
    return useQuery(guildChannelsQuery(guildId));
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
    return useQuery(channelStatsByGuildQuery(guildId));
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
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (enabled: boolean) =>
            api.channels.bulkUpdate(guildId, enabled),

        onMutate: async enabled => {
            // Stop any in-flight refetches of the channels list
            await qc.cancelQueries({
                queryKey: channelKeys.byGuild(guildId),
            });

            // Optimistically patch cache (choose A or B)
            const snapshot = optimisticBulkUpdateChannels(qc, guildId, enabled);

            return { snapshot };
        },

        onError: (_err, _enabled, ctx) => {
            // Roll back if we had a snapshot
            const prev = ctx?.snapshot?.prev;
            if (prev) qc.setQueryData(channelKeys.byGuild(guildId), prev);
        },

        onSettled: () => {
            // Revalidate canonical data
            qc.invalidateQueries({
                queryKey: channelKeys.byGuild(guildId),
            });
            // If other views depend on the same flag (e.g. stats), also:
            qc.invalidateQueries({
                queryKey: channelKeys.statsByGuild(guildId),
            });
        },
    });
}
