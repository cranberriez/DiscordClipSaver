"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
    guildKeys,
    guildQuery,
    guildsQuery,
    guildsDiscordQuery,
} from "@/lib/queries";
import { Guild } from "../api/guild";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch list of user's guilds from Discord with DB enrichment.
 *
 * @example
 * ```tsx
 * function GuildList() {
 *   const { data, isLoading, error } = useGuilds();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {data.guilds.map(guild => (
 *         <div key={guild.id}>{guild.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGuilds(includePerms?: boolean) {
    return useQuery(guildsQuery(includePerms));
}

/**
 * Fetch list of user's guilds from Discord with DB enrichment.
 *
 * @example
 * ```tsx
 * function GuildList() {
 *   const { data, isLoading, error } = useGuildsDiscord();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {data.guilds.map(guild => (
 *         <div key={guild.id}>{guild.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGuildsDiscord(includeDB?: boolean) {
    return useQuery(guildsDiscordQuery(includeDB));
}

/**
 * Fetch a single guild by ID.
 *
 * Note: This currently doesn't have an API route.
 * You'll need to either:
 * 1. Pass guild data from Server Component as initial data
 * 2. Create a GET /api/guilds/[guildId] route
 *
 * @param guildId - The guild ID
 */
export function useGuild(guildId: string) {
    return useQuery(guildQuery(guildId));
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Toggle message scanning for a guild with optimistic updates.
 *
 * Features:
 * - Optimistic UI update (instant feedback)
 * - Automatic rollback on error
 * - Cache invalidation on success
 *
 * @example
 * ```tsx
 * function GuildHeader({ guild }: { guild: Guild }) {
 *   const toggleMutation = useToggleScanning(guild.id);
 *
 *   const handleToggle = () => {
 *     toggleMutation.mutate(!guild.message_scan_enabled);
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleToggle}
 *       disabled={toggleMutation.isPending}
 *     >
 *       {guild.message_scan_enabled ? 'Disable' : 'Enable'} Scanning
 *     </button>
 *   );
 * }
 * ```
 */
export function useToggleScanning(guildId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (enabled: boolean) =>
            api.guilds.toggleScanning(guildId, enabled),

        // Optimistic update
        onMutate: async enabled => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: guildKeys.detail(guildId),
            });

            // Snapshot previous value
            const previousGuild = queryClient.getQueryData<Guild>(
                guildKeys.detail(guildId)
            );

            // Optimistically update
            if (previousGuild) {
                queryClient.setQueryData<Guild>(guildKeys.detail(guildId), {
                    ...previousGuild,
                    message_scan_enabled: enabled,
                });
            }

            return { previousGuild };
        },

        // Rollback on error
        onError: (err, variables, context) => {
            if (context?.previousGuild) {
                queryClient.setQueryData(
                    guildKeys.detail(guildId),
                    context.previousGuild
                );
            }
        },

        // Refetch on success to ensure consistency
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: guildKeys.detail(guildId),
            });
        },
    });
}
