import type { ColumnType, Insertable, Selectable, Updateable } from "kysely";

export interface GuildSettingsTable {
	id: ColumnType<number, number | undefined, never>;
	guild_id: string;
	default_channel_settings: ColumnType<
		unknown | null,
		unknown | null | undefined,
		unknown | null | undefined
	>;
	settings: ColumnType<
		unknown | null,
		unknown | null | undefined,
		unknown | null | undefined
	>;
	/**
	 * MD5 hash of the settings, owned by the Python resolver
	 * (shared/user_settings_resolver.py). Used for worker cache invalidation
	 * and clip reprocessing detection. Any writer that changes settings MUST
	 * null this column so the Python side recomputes it.
	 */
	settings_hash: ColumnType<
		string | null,
		string | null | undefined,
		string | null | undefined
	>;
	created_at: ColumnType<Date, Date | undefined, Date | undefined>;
	updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
	deleted_at: ColumnType<
		Date | null,
		Date | null | undefined,
		Date | null | undefined
	>;
}

export type GuildSettings = Selectable<GuildSettingsTable>;
export type NewGuildSettings = Insertable<GuildSettingsTable>;
export type GuildSettingsUpdate = Updateable<GuildSettingsTable>;
