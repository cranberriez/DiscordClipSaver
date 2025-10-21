import type { AuthorWithStats } from "@/lib/api/author";

/**
 * Maps database author query results to AuthorWithStats DTO
 */
export class AuthorMapper {
    static toAuthorWithStats(dbAuthor: {
        id: string;
        username: string;
        avatar_url: string | null;
        clip_count: number;
        channel_clip_counts: Record<string, number>;
    }): AuthorWithStats {
        return {
            id: dbAuthor.id,
            username: dbAuthor.username,
            avatar_url: dbAuthor.avatar_url,
            clip_count: dbAuthor.clip_count,
            channel_clip_counts: dbAuthor.channel_clip_counts,
        };
    }
}
