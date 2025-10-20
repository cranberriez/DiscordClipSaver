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
