import type { ColumnType, Insertable, Selectable, Updateable } from "kysely";

export interface ChannelSettingsTable {
    id: ColumnType<number, number | undefined, never>;
    channel_id: string;
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

export type ChannelSettings = Selectable<ChannelSettingsTable>;
export type NewChannelSettings = Insertable<ChannelSettingsTable>;
export type ChannelSettingsUpdate = Updateable<ChannelSettingsTable>;
