import { getDb } from "../db";
import type { DbGuild } from "../types";

export interface GuildWithClipCount extends DbGuild {
    clip_count: number;
}

export interface GuildWithStats extends DbGuild {
    clip_count?: number;
    author_count?: number;
}

export interface GuildStatsOptions {
    withClipCount?: boolean;
    withAuthorCount?: boolean;
}

export async function getGuildsByIds(guildIds: string[]): Promise<DbGuild[]> {
    if (guildIds.length === 0) return [];

    const guilds = await getDb()
        .selectFrom("guild")
        .selectAll()
        .where("id", "in", guildIds)
        .where("deleted_at", "is", null) // soft-deletion policy
        .execute();

    return guilds;
}

export async function getSingleGuildById(
    guildId: string
): Promise<DbGuild | null> {
    const guild = await getDb()
        .selectFrom("guild")
        .selectAll()
        .where("id", "=", guildId)
        .where("deleted_at", "is", null) // soft-deletion policy
        .executeTakeFirst();

    if (!guild) return null;

    return guild;
}

export async function setGuildOwnerIfUnclaimed(
    guildId: string,
    userId: string
): Promise<boolean> {
    const res = await getDb()
        .updateTable("guild")
        .set({ owner_id: userId })
        .where("id", "=", guildId)
        .where("owner_id", "is", null)
        .where("deleted_at", "is", null) // can't claim deleted guilds
        .executeTakeFirst();

    const affected = Number(
        (res as { numUpdatedRows?: bigint | number })?.numUpdatedRows ?? 0
    );
    return affected > 0;
}

/**
 * Toggle message scanning for a guild
 */
export async function updateGuildMessageScanEnabled(
    guildId: string,
    enabled: boolean
): Promise<void> {
    await getDb()
        .updateTable("guild")
        .set({
            message_scan_enabled: enabled,
            updated_at: new Date(),
        })
        .where("id", "=", guildId)
        .executeTakeFirst();
}

/**
 * Get guilds by IDs with clip counts
 */
export async function getGuildsByIdsWithClipCount(
    guildIds: string[]
): Promise<GuildWithClipCount[]> {
    if (guildIds.length === 0) return [];

    const guilds = await getDb()
        .selectFrom("guild")
        .leftJoin("clip", join =>
            join
                .onRef("clip.guild_id", "=", "guild.id")
                .on("clip.deleted_at", "is", null)
        )
        .selectAll("guild")
        .select(eb => eb.fn.count<number>("clip.id").as("clip_count"))
        .where("guild.id", "in", guildIds)
        .where("guild.deleted_at", "is", null)
        .groupBy("guild.id")
        .execute();

    return guilds as GuildWithClipCount[];
}

/**
 * Get guilds by IDs with optional stats (clip count, author count)
 * Efficiently fetches only requested stats in a single query
 */
export async function getGuildsByIdsWithStats(
    guildIds: string[],
    options: GuildStatsOptions = {}
): Promise<GuildWithStats[]> {
    if (guildIds.length === 0) return [];

    const { withClipCount = false, withAuthorCount = false } = options;

    // If no stats requested, just return basic guild data
    if (!withClipCount && !withAuthorCount) {
        return getGuildsByIds(guildIds);
    }

    const db = getDb();
    let query = db.selectFrom("guild").selectAll("guild");

    // Add clip count if requested
    if (withClipCount) {
        query = query.select(eb =>
            eb
                .selectFrom("clip")
                .select(eb2 => eb2.fn.countAll<string>().as("count"))
                .whereRef("clip.guild_id", "=", "guild.id")
                .where("clip.deleted_at", "is", null)
                .as("clip_count")
        );
    }

    // Add author count if requested
    if (withAuthorCount) {
        query = query.select(eb =>
            eb
                .selectFrom("author")
                .select(eb2 => eb2.fn.countAll<string>().as("count"))
                .whereRef("author.guild_id", "=", "guild.id")
                .as("author_count")
        );
    }

    const guilds = await query
        .where("guild.id", "in", guildIds)
        .where("guild.deleted_at", "is", null)
        .execute();

    return guilds as GuildWithStats[];
}
