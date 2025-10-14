import { getDb } from "../db";
import type { Guild } from "../types";

export async function getGuildsByIds(guildIds: string[]): Promise<Guild[]> {
    if (guildIds.length === 0) return [];
    
    const guilds = await getDb()
        .selectFrom("guild")
        .selectAll()
        .where("id", "in", guildIds)
        .execute();

    return guilds;
}

export async function getSingleGuildById(guildId: string): Promise<Guild | null> {
    const guild = await getDb()
        .selectFrom("guild")
        .selectAll()
        .where("id", "=", guildId)
        .executeTakeFirst();
    
    if (!guild) return null;

    return guild;
}

export async function setGuildOwnerIfUnclaimed(guildId: string, userId: string): Promise<boolean> {
    const res = await getDb()
        .updateTable("guild")
        .set({ owner: userId })
        .where("id", "=", guildId)
        .where("owner", "is", null)
        .executeTakeFirst();
    
    const affected = Number((res as { numUpdatedRows?: bigint | number })?.numUpdatedRows ?? 0);
    return affected > 0;
}
