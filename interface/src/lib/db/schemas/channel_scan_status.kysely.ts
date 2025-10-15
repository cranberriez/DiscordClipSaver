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
    guild_id: string;
    channel_id: string;
    status: ScanStatus;
    message_count: number;
    total_messages_scanned: number;
    forward_message_id: string | null;
    backward_message_id: string | null;
    error_message: string | null;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string>;
}

export type ChannelScanStatus = Selectable<ChannelScanStatusTable>;
export type NewChannelScanStatus = Insertable<ChannelScanStatusTable>;
export type ChannelScanStatusUpdate = Updateable<ChannelScanStatusTable>;
