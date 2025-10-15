/**
 * Database queries for channel scan status
 */
import "server-only";
import { getDb } from "../db";
import type { ChannelScanStatus, ScanStatus } from "../types";

/**
 * Get scan status for a specific channel
 */
export async function getChannelScanStatus(
    guildId: string,
    channelId: string
): Promise<ChannelScanStatus | null> {
    const db = getDb();

    const status = await db
        .selectFrom("channel_scan_status")
        .selectAll()
        .where("guild_id", "=", guildId)
        .where("channel_id", "=", channelId)
        .executeTakeFirst();

    return status || null;
}

/**
 * Get scan statuses for all channels in a guild
 */
export async function getGuildScanStatuses(
    guildId: string
): Promise<ChannelScanStatus[]> {
    const db = getDb();

    const statuses = await db
        .selectFrom("channel_scan_status")
        .selectAll()
        .where("guild_id", "=", guildId)
        .orderBy("updated_at", "desc")
        .execute();

    return statuses;
}

/**
 * Get scan statuses with channel info
 */
export async function getChannelScanStatusesWithInfo(guildId: string): Promise<
    Array<{
        channelId: string;
        channelName: string;
        status: ScanStatus | null;
        messageCount: number;
        totalMessagesScanned: number;
        updatedAt: Date | null;
    }>
> {
    const db = getDb();

    const results = await db
        .selectFrom("channel")
        .leftJoin("channel_scan_status", join =>
            join
                .onRef("channel.id", "=", "channel_scan_status.channel_id")
                .onRef("channel.guild_id", "=", "channel_scan_status.guild_id")
        )
        .select([
            "channel.id as channelId",
            "channel.name as channelName",
            "channel_scan_status.status as status",
            "channel_scan_status.message_count as messageCount",
            "channel_scan_status.total_messages_scanned as totalMessagesScanned",
            "channel_scan_status.updated_at as updatedAt",
        ])
        .where("channel.guild_id", "=", guildId)
        .where("channel.deleted_at", "is", null)
        .orderBy("channel.name", "asc")
        .execute();

    return results.map(row => ({
        channelId: row.channelId,
        channelName: row.channelName,
        status: row.status || null,
        messageCount: row.messageCount || 0,
        totalMessagesScanned: row.totalMessagesScanned || 0,
        updatedAt: row.updatedAt || null,
    }));
}
