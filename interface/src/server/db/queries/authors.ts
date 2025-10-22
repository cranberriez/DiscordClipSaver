import { getDb } from "../db";
import type { SelectableAuthor } from "../schemas/author.kysely";

export interface AuthorWithStats extends SelectableAuthor {
    clip_count: number;
    channel_clip_counts: Record<string, number>;
}

/**
 * Get all authors for a guild.
 * @param guildId The ID of the guild.
 * @returns An array of authors in the guild.
 */
export async function getAuthorsByGuildId(
    guildId: string
): Promise<SelectableAuthor[]> {
    return await getDb()
        .selectFrom("author")
        .selectAll()
        .where("guild_id", "=", guildId)
        .orderBy("display_name", "asc")
        .execute();
}

/**
 * Get a single author by their user ID and guild ID.
 * @param guildId The ID of the guild.
 * @param userId The ID of the user.
 * @returns The author, or undefined if not found.
 */
export async function getAuthorById(
    guildId: string,
    userId: string
): Promise<SelectableAuthor | undefined> {
    return await getDb()
        .selectFrom("author")
        .selectAll()
        .where("guild_id", "=", guildId)
        .where("user_id", "=", userId)
        .executeTakeFirst();
}

/**
 * Get all authors with clip statistics for a specific guild.
 * @param guildId The ID of the guild.
 * @returns An array of authors with their clip counts.
 */
export async function getAuthorStatsByGuildId(
    guildId: string
): Promise<AuthorWithStats[]> {
    const db = getDb();

    const authors = await db
        .selectFrom("author as a")
        .leftJoin("message as m", "m.author_id", "a.user_id")
        .leftJoin("clip as c", "c.message_id", "m.id")
        .selectAll("a")
        .select(eb => eb.fn.count("c.id").as("clip_count"))
        .where("a.guild_id", "=", guildId)
        .where("m.guild_id", "=", guildId)
        .where("c.deleted_at", "is", null)
        .where("m.deleted_at", "is", null)
        .groupBy("a.id")
        .orderBy("clip_count", "desc")
        .execute();

    const authorsWithChannelCounts = await Promise.all(
        authors.map(async author => {
            const channelCounts = await db
                .selectFrom("message as m")
                .innerJoin("clip as c", "m.id", "c.message_id")
                .select(eb => ["m.channel_id", eb.fn.count("c.id").as("count")])
                .where("m.author_id", "=", author.user_id)
                .where("m.guild_id", "=", guildId)
                .where("c.deleted_at", "is", null)
                .where("m.deleted_at", "is", null)
                .groupBy("m.channel_id")
                .execute();

            const channelClipCounts = channelCounts.reduce((acc, curr) => {
                acc[curr.channel_id] = Number(curr.count);
                return acc;
            }, {} as Record<string, number>);

            return {
                ...author,
                clip_count: Number(author.clip_count),
                channel_clip_counts: channelClipCounts,
            };
        })
    );

    return authorsWithChannelCounts;
}

/**
 * Get a single author with clip statistics by their user ID and guild ID.
 * @param guildId The ID of the guild.
 * @param userId The ID of the user.
 * @returns The author with clip stats, or undefined if not found.
 */
export async function getAuthorStatsById(
    guildId: string,
    userId: string
): Promise<AuthorWithStats | undefined> {
    const db = getDb();

    const author = await db
        .selectFrom("author as a")
        .leftJoin("message as m", "m.author_id", "a.user_id")
        .leftJoin("clip as c", "c.message_id", "m.id")
        .selectAll("a")
        .select(eb => eb.fn.count("c.id").as("clip_count"))
        .where("a.guild_id", "=", guildId)
        .where("a.user_id", "=", userId)
        .where("m.guild_id", "=", guildId)
        .where("c.deleted_at", "is", null)
        .where("m.deleted_at", "is", null)
        .groupBy("a.id")
        .executeTakeFirst();

    if (!author) return undefined;

    const channelCounts = await db
        .selectFrom("message as m")
        .innerJoin("clip as c", "m.id", "c.message_id")
        .select(eb => ["m.channel_id", eb.fn.count("c.id").as("count")])
        .where("m.author_id", "=", userId)
        .where("m.guild_id", "=", guildId)
        .where("c.deleted_at", "is", null)
        .where("m.deleted_at", "is", null)
        .groupBy("m.channel_id")
        .execute();

    const channelClipCounts = channelCounts.reduce((acc, curr) => {
        acc[curr.channel_id] = Number(curr.count);
        return acc;
    }, {} as Record<string, number>);

    return {
        ...author,
        clip_count: Number(author.clip_count),
        channel_clip_counts: channelClipCounts,
    };
}
