import { getDb } from "../db";
import type { DbGuildSettings } from "../types";

/**
 * Get guild settings by guild ID.
 */
export async function getGuildSettings(
	guildId: string
): Promise<DbGuildSettings | null> {
	const settings = await getDb()
		.selectFrom("guild_settings")
		.selectAll()
		.where("guild_id", "=", guildId)
		.where("deleted_at", "is", null)
		.executeTakeFirst();

	return settings ?? null;
}

/**
 * Upsert guild settings with partial updates.
 * This merges the provided settings with existing ones.
 *
 * @param guildId - The guild ID
 * @param settings - Partial guild settings to merge
 * @param defaultChannelSettings - Partial default channel settings to merge
 * @returns The updated guild settings
 */
export async function upsertGuildSettings(
	guildId: string,
	settings?: Record<string, unknown>,
	defaultChannelSettings?: Record<string, unknown>
): Promise<DbGuildSettings> {
	const db = getDb();

	const now = new Date();

	// Check if settings exist
	const existing = await getGuildSettings(guildId);

	if (existing) {
		// Merge with existing settings
		const updatedSettings = settings
			? {
					...((existing.settings as Record<string, unknown>) ?? {}),
					...settings,
				}
			: existing.settings;

		const updatedDefaultChannelSettings = defaultChannelSettings
			? {
					...((existing.default_channel_settings as Record<
						string,
						unknown
					>) ?? {}),
					...defaultChannelSettings,
				}
			: existing.default_channel_settings;

		const updated = await db
			.updateTable("guild_settings")
			.set({
				settings: updatedSettings as unknown,
				default_channel_settings:
					updatedDefaultChannelSettings as unknown,
				updated_at: new Date(),
			})
			.where("id", "=", existing.id)
			.returningAll()
			.executeTakeFirstOrThrow();

		return updated;
	} else {
		// Create new settings
		const inserted = await db
			.insertInto("guild_settings")
			.values({
				guild_id: guildId,
				settings: (settings ?? {}) as unknown,
				default_channel_settings: (defaultChannelSettings ??
					{}) as unknown,
				created_at: now,
				updated_at: now,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		return inserted;
	}
}

/**
 * Delete guild settings (soft delete).
 */
export async function deleteGuildSettings(guildId: string): Promise<boolean> {
	const res = await getDb()
		.updateTable("guild_settings")
		.set({ deleted_at: new Date() })
		.where("guild_id", "=", guildId)
		.where("deleted_at", "is", null)
		.executeTakeFirst();

	const affected = Number(
		(res as { numUpdatedRows?: bigint | number })?.numUpdatedRows ?? 0
	);
	return affected > 0;
}
