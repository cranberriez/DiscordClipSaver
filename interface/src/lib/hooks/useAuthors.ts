"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authorKeys, authorStatsQuery } from "@/lib/queries/author";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch author statistics for a guild.
 * Returns all authors with clip counts and per-channel breakdowns.
 *
 * @param guildId - The guild ID
 *
 * @example
 * ```tsx
 * function AuthorsList({ guildId }: { guildId: string }) {
 *   const { data: authors, isLoading } = useAuthorStats(guildId);
 *
 *   if (isLoading) return <div>Loading authors...</div>;
 *
 *   return (
 *     <ul>
 *       {authors?.map(author => (
 *         <li key={author.id}>
 *           {author.username}: {author.clip_count} clips
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAuthorStats(guildId: string) {
	return useQuery(authorStatsQuery(guildId));
}

/**
 * Prefetch author statistics for a guild.
 * Useful for preloading data when a guild is selected.
 *
 * @example
 * ```tsx
 * function GuildSelector() {
 *   const prefetchAuthors = usePrefetchAuthorStats();
 *
 *   const handleSelectGuild = (guildId: string) => {
 *     // Prefetch authors immediately when guild is selected
 *     prefetchAuthors(guildId);
 *     setSelectedGuildId(guildId);
 *   };
 *
 *   return <button onClick={() => handleSelectGuild('123')}>Select Guild</button>;
 * }
 * ```
 */
export function usePrefetchAuthorStats() {
	const queryClient = useQueryClient();

	return (guildId: string) => {
		queryClient.prefetchQuery(authorStatsQuery(guildId));
	};
}

// Export authorKeys for manual cache invalidation
export { authorKeys };
