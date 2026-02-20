/**
 * Database queries for channel scan status
 */
import "server-only";
import { getDb } from "../db";
import type { DbChannelScanStatus, DbChannelScanStatusUpdate } from "../types";

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

/**
 * Get scan statuses for a list of channels
 */
export async function getScanStatusesForChannels(
	guildId: string,
	channelIds: string[]
): Promise<DbChannelScanStatus[]> {
	if (channelIds.length === 0) return [];

	const db = getDb();

	const statuses = await db
		.selectFrom("channel_scan_status")
		.selectAll()
		.where("guild_id", "=", guildId)
		.where("channel_id", "in", channelIds)
		.execute();

	return statuses;
}

/**
 * Update scan status for a specific channel (only if row exists)
 */
export async function updateChannelScanStatus(
	guildId: string,
	channelId: string,
	status: DbChannelScanStatusUpdate
): Promise<DbChannelScanStatus | null> {
	const db = getDb();

	const updatedStatus = await db
		.updateTable("channel_scan_status")
		.set(status)
		.where("guild_id", "=", guildId)
		.where("channel_id", "=", channelId)
		.returningAll()
		.executeTakeFirst();

	return updatedStatus || null;
}

/**
 * Upsert scan status for a specific channel (insert or update)
 *
 * This ensures the row exists before the worker picks up the job,
 * preventing the "unscanned" flash when starting new scans.
 */
export async function upsertChannelScanStatus(
	guildId: string,
	channelId: string,
	status: DbChannelScanStatusUpdate
): Promise<DbChannelScanStatus> {
	const db = getDb();

	const now = new Date();

	const result = await db
		.insertInto("channel_scan_status")
		.values({
			guild_id: guildId,
			channel_id: channelId,
			message_count: 0,
			total_messages_scanned: 0,
			...status,
			created_at: now,
			updated_at: now,
		})
		.onConflict((oc) =>
			oc.columns(["guild_id", "channel_id"]).doUpdateSet({
				...status,
				updated_at: now,
			})
		)
		.returningAll()
		.executeTakeFirstOrThrow();

	return result;
}
