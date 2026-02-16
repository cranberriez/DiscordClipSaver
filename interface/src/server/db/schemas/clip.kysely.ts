import type { ColumnType, Selectable } from "kysely";

export interface ClipTable {
    id: string;
    message_id: string;
    guild_id: string;
    channel_id: string;
    filename: string;
    file_size: ColumnType<bigint, bigint | number, bigint | number>;
    mime_type: string;
    visibility: ColumnType<
        "PUBLIC" | "UNLISTED" | "PRIVATE",
        "PUBLIC" | "UNLISTED" | "PRIVATE" | undefined,
        "PUBLIC" | "UNLISTED" | "PRIVATE" | undefined
    >;
    duration: ColumnType<
        number | null,
        number | null | undefined,
        number | null | undefined
    >;
    resolution: ColumnType<
        string | null,
        string | null | undefined,
        string | null | undefined
    >;
    settings_hash: ColumnType<
        string | null,
        string | null | undefined,
        string | null | undefined
    >;
    cdn_url: string;
    expires_at: Date;
    thumbnail_status: ColumnType<
        string,
        string | undefined,
        string | undefined
    >;
    deleted_at: ColumnType<
        Date | null,
        Date | null | undefined,
        Date | null | undefined
    >;
    created_at: ColumnType<Date, Date | undefined, Date | undefined>;
    updated_at: ColumnType<Date, Date | undefined, Date | undefined>;
}

export type Clip = Selectable<ClipTable>;
