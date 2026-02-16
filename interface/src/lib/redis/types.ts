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

export type RescanMode = "stop" | "continue" | "update";

export interface BatchScanJob extends BaseJob {
    type: "batch";
    direction: "forward" | "backward";
    limit: number;
    before_message_id?: string | null;
    after_message_id?: string | null;
    auto_continue: boolean;
    rescan?: RescanMode; // How to handle already-processed messages
}

export interface MessageScanJob extends BaseJob {
    type: "message";
    message_ids: string[];
}

export interface PurgeChannelJob extends BaseJob {
    type: "purge_channel";
}

export interface PurgeGuildJob extends BaseJob {
    type: "purge_guild";
}

export interface ThumbnailCleanupJob extends BaseJob {
    type: "thumbnail_cleanup";
    timeout_minutes: number;
}

export type Job =
    | BatchScanJob
    | MessageScanJob
    | PurgeChannelJob
    | PurgeGuildJob
    | ThumbnailCleanupJob;

/**
 * Scan status from database
 */
export type ScanStatus =
    | "QUEUED"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";

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
