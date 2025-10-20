/**
 * Kysely schema for channel_scan_status table
 */
import type { ColumnType, Selectable, Insertable, Updateable } from "kysely";

export type ScanStatus =
    | "PENDING"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";

export interface ChannelScanStatusTable {
    id: ColumnType<number, number | undefined, never>;
    guild_id: string;
    channel_id: string;
    status: ColumnType<
        ScanStatus,
        ScanStatus | undefined,
        ScanStatus | undefined
    >;
    message_count: ColumnType<number, number | undefined, number | undefined>;
    total_messages_scanned: ColumnType<
        number,
        number | undefined,
        number | undefined
    >;
    forward_message_id: ColumnType<
        string | null,
        string | null | undefined,
        string | null | undefined
    >;
    backward_message_id: ColumnType<
        string | null,
        string | null | undefined,
        string | null | undefined
    >;
    error_message: ColumnType<
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

export type ChannelScanStatus = Selectable<ChannelScanStatusTable>;
export type NewChannelScanStatus = Insertable<ChannelScanStatusTable>;
export type ChannelScanStatusUpdate = Updateable<ChannelScanStatusTable>;
