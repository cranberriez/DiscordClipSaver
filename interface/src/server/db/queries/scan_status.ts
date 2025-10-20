/**
 * Database queries for channel scan status
 */
import "server-only";
import { getDb } from "../db";
import type { DbChannelScanStatus, DbScanStatus } from "../types";

/**
 * Get scan status for a specific channel
 */
export async function getChannelScanStatus(
    guildId: string,
    channelId: string
): Promise<DbChannelScanStatus | null> {
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
): Promise<DbChannelScanStatus[]> {
    const db = getDb();

    const statuses = await db
        .selectFrom("channel_scan_status")
        .selectAll()
        .where("guild_id", "=", guildId)
        .orderBy("updated_at", "desc")
        .execute();

    return statuses;
}
