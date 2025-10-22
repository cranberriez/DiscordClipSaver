/**
 * Author API Types and Functions
 */

/**
 * Author with clip statistics
 * Used for displaying author information in clips viewer
 */
export interface AuthorWithStats {
    user_id: string;
    display_name: string; // User display name, overrides username if present, overrided by nickname if present
    avatar_url: string | null; // User avatar URL, is replaced with guild avatar URL if present
    clip_count?: number;
    channel_clip_counts?: Record<string, number>; // channelId -> count
}

/**
 * Response from GET /api/guilds/[guildId]/authors/stats
 */
export type AuthorStatsResponse = AuthorWithStats[];
