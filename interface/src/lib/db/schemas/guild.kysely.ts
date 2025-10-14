import type { ColumnType, Selectable } from "kysely";

export interface GuildTable {
    id: string;
    owner_id: ColumnType<
        string | null,
        string | null | undefined,
        string | null | undefined
    >;
    name: string;
    icon_url: ColumnType<
        string | null,
        string | null | undefined,
        string | null | undefined
    >;
    message_scan_enabled: ColumnType<
        boolean,
        boolean | undefined,
        boolean | undefined
    >;
    last_message_scan_at: ColumnType<
        Date | null,
        Date | null | undefined,
        Date | null | undefined
    >;
    created_at: ColumnType<Date, Date | undefined, Date | undefined>;
    updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
    deleted_at: ColumnType<
        Date | null,
        Date | null | undefined,
        Date | null | undefined
    >;
}

export type Guild = Selectable<GuildTable>;
