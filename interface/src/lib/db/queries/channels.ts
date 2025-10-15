import { getDb } from "../db";
import type { Channel } from "../types";

export async function getChannelsByGuildId(
    guildId: string
): Promise<Channel[]> {
    const channels = await getDb()
        .selectFrom("channel")
        .selectAll()
        .where("guild_id", "=", guildId)
        // Filter out category and voice channels - they cannot be scanned
        .where("type", "not in", ["category"])
        .execute();

    return channels;
}

/**
 * Bulk enable/disable all channels for a guild.
 *
 * @param guildId - The guild ID
 * @param enabled - Whether to enable or disable message scanning
 * @returns Number of channels updated
 */
export async function bulkUpdateChannelsEnabled(
    guildId: string,
    enabled: boolean
): Promise<number> {
    const result = await getDb()
        .updateTable("channel")
        .set({
            message_scan_enabled: enabled,
            updated_at: new Date(),
        })
        .where("guild_id", "=", guildId)
        .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0);
}
