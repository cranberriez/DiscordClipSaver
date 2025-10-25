"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
    guildKeys,
    guildQuery,
    guildsQuery,
    guildsDiscordQuery,
    guildsWithClipCountQuery,
    guildStatsQuery,
} from "@/lib/queries";
import { Guild, type GuildStatsOptions } from "../api/guild";

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
 * Fetch list of user's guilds with clip counts.
 *
 * Returns guilds that exist in the database with their clip counts.
 * Useful for the clips viewer guild selection.
 *
 * @example
 * ```tsx
 * function GuildSelector() {
 *   const { data: guilds, isLoading } = useGuildsWithClipCount();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {guilds?.map(guild => (
 *         <div key={guild.id}>
 *           {guild.name} - {guild.clip_count} clips
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGuildsWithClipCount() {
    return useQuery(guildsWithClipCountQuery());
}

/**
 * Fetch a single guild by ID.
 *
 * Supports initialData from Server Components for seamless SSR + client-side updates.
 *
 * @param guildId - The guild ID
 * @param options - Query options including initialData
 *
 * @example
 * ```tsx
 * // In Client Component receiving server data
 * function GuildHeader({ guild: serverGuild }: { guild: Guild }) {
 *   const { data: guild } = useGuild(serverGuild.id, { initialData: serverGuild });
 *   // guild will update reactively when mutations occur
 * }
 * ```
 */
export function useGuild(guildId: string, options?: { initialData?: Guild }) {
    return useQuery(guildQuery(guildId, options));
}

/**
 * Fetch stats for multiple guilds.
 *
 * Allows flexible fetching of guild statistics (clip count, author count).
 * Only returns stats for guilds the user has access to via Discord.
 *
 * @param guildIds - Array of guild IDs to fetch stats for
 * @param options - Options for which stats to include
 *
 * @example
 * ```tsx
 * function GuildStatsDisplay({ guildIds }: { guildIds: string[] }) {
 *   const { data: guilds, isLoading } = useGuildStats(guildIds, {
 *     withClipCount: true,
 *     withAuthorCount: true,
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {guilds?.map(guild => (
 *         <div key={guild.id}>
 *           {guild.name}: {guild.clip_count} clips, {guild.author_count} authors
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGuildStats(
    guildIds: string[],
    options?: GuildStatsOptions
) {
    return useQuery(guildStatsQuery(guildIds, options));
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
