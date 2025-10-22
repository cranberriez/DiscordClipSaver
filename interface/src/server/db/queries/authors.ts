import { getDb } from "../db";
import type { SelectableAuthor } from "../schemas/author.kysely";

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
