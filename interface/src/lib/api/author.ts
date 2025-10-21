/**
 * Author API Types and Functions
 */

/**
 * Author with clip statistics
 * Used for displaying author information in clips viewer
 */
export interface AuthorWithStats {
    id: string;
    username: string;
    avatar_url: string | null;
    clip_count: number;
    channel_clip_counts: Record<string, number>; // channelId -> count
}

/**
 * Response from GET /api/guilds/[guildId]/authors/stats
 */
export type AuthorStatsResponse = AuthorWithStats[];
