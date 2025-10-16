/**
 * Job types for Redis queue
 * These match the Python Pydantic models in shared/redis/redis.py
 */

export interface BaseJob {
    job_id: string;
    guild_id: string;
    channel_id: string;
    created_at: string; // ISO datetime string
}

export interface BatchScanJob extends BaseJob {
    type: "batch";
    direction: "forward" | "backward";
    limit: number;
    before_message_id?: string | null;
    after_message_id?: string | null;
    auto_continue: boolean;
    rescan?: boolean; // Whether to rescan already-processed messages
}

export interface MessageScanJob extends BaseJob {
    type: "message";
    message_ids: string[];
}

export type Job = BatchScanJob | MessageScanJob;

/**
 * Scan status from database
 */
export type ScanStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface ChannelScanStatus {
    guild_id: string;
    channel_id: string;
    status: ScanStatus;
    message_count: number;
    total_messages_scanned: number;
    forward_message_id: string | null;
    backward_message_id: string | null;
    error_message: string | null;
    created_at: Date;
    updated_at: Date;
}
