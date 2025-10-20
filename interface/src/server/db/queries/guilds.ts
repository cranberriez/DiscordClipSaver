import { getDb } from "../db";
import type { DbGuild } from "../types";

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
