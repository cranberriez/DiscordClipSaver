import { getDb } from "../db";
import type { Channel } from "../types";

export async function getChannelsByGuildId(guildId: string): Promise<Channel[]> {
    const channels = await getDb()
        .selectFrom("channel")
        .selectAll()
        .where("guild_id", "=", guildId)
        .execute();
    
    return channels;
}
