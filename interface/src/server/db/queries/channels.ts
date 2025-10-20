import { getDb } from "../db";
import type { DbChannel, DbChannelWithClipCount } from "../types";

export async function getChannelsByGuildId(
    guildId: string
): Promise<DbChannel[]> {
    const channels = await getDb()
        .selectFrom("channel")
        .selectAll()
        .where("guild_id", "=", guildId)
        // Filter out category and voice channels - they cannot be scanned
        .where("type", "not in", ["category"])
        .where("deleted_at", "is", null)
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

export async function getChannelById(
    guildId: string,
    channelId: string
): Promise<DbChannel | undefined> {
    const channel = await getDb()
        .selectFrom("channel")
        .selectAll()
        .where("guild_id", "=", guildId)
        .where("id", "=", channelId)
        .executeTakeFirst();

    return channel;
}

export async function getChannelsByGuildIdWithClipCount(
    guildId: string
): Promise<DbChannelWithClipCount[]> {
    const channelsRaw = await getDb()
        .selectFrom("channel")
        .selectAll("channel")
        .select(eb => [
            eb
                .selectFrom("clip")
                .select(eb2 => eb2.fn.countAll<string>().as("count"))
                .whereRef("clip.channel_id", "=", "channel.id")
                .where("clip.deleted_at", "is", null)
                .as("clip_count"),
        ])
        .where("channel.guild_id", "=", guildId)
        .where("channel.deleted_at", "is", null)
        .orderBy("channel.name", "asc")
        .execute();

    const channels = channelsRaw.map(c => ({
        ...c,
        clip_count: parseInt(
            (c as unknown as { clip_count?: string }).clip_count ?? "0",
            10
        ),
    }));

    return channels as DbChannelWithClipCount[];
}
