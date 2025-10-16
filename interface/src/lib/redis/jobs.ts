/**
 * Redis job queue operations
 * Interface is a producer - pushes jobs to queue for worker to consume
 */
import "server-only";
import { getRedis } from "./client";
import type { BatchScanJob, MessageScanJob } from "./types";
import { randomUUID } from "crypto";

const STREAM_PREFIX = "jobs";

/**
 * Build Redis stream name for a job
 * Format: jobs:guild:{guild_id}:{job_type}
 */
function buildStreamName(guildId: string, jobType: string): string {
    return `${STREAM_PREFIX}:guild:${guildId}:${jobType}`;
}

/**
 * Ensure consumer group exists for a stream
 * This is idempotent - won't error if group already exists
 */
async function ensureConsumerGroup(streamName: string): Promise<void> {
    const redis = getRedis();
    
    try {
        await redis.xgroup(
            "CREATE",
            streamName,
            "worker_group",
            "0",
            "MKSTREAM"
        );
    } catch (error: any) {
        // Ignore BUSYGROUP error (group already exists)
        if (!error.message?.includes("BUSYGROUP")) {
            throw error;
        }
    }
}

/**
 * Push a job to the Redis stream
 */
async function pushJob(job: BatchScanJob | MessageScanJob): Promise<string> {
    const redis = getRedis();
    
    const streamName = buildStreamName(job.guild_id, job.type);
    
    // Ensure consumer group exists
    await ensureConsumerGroup(streamName);
    
    // Serialize job data
    const jobData = {
        job: JSON.stringify(job),
        guild_id: job.guild_id,
        channel_id: job.channel_id,
        job_type: job.type,
        job_id: job.job_id,
    };
    
    // Push to stream
    const messageId = await redis.xadd(streamName, "*", ...Object.entries(jobData).flat());
    
    return messageId as string;
}

/**
 * Start a batch scan for a channel
 */
export async function startBatchScan(params: {
    guildId: string;
    channelId: string;
    direction?: "forward" | "backward";
    limit?: number;
    beforeMessageId?: string;
    afterMessageId?: string;
    autoContinue?: boolean;
    rescan?: "stop" | "continue" | "update";
}): Promise<{ jobId: string; messageId: string }> {
    const {
        guildId,
        channelId,
        direction = "backward",
        limit = 100,
        beforeMessageId = null,
        afterMessageId = null,
        autoContinue = true,
        rescan = "stop",
    } = params;
    
    const job: BatchScanJob = {
        job_id: randomUUID(),
        guild_id: guildId,
        channel_id: channelId,
        type: "batch",
        direction,
        limit,
        before_message_id: beforeMessageId ?? null,
        after_message_id: afterMessageId ?? null,
        auto_continue: autoContinue,
        rescan,
        created_at: new Date().toISOString(),
    };
    
    const messageId = await pushJob(job);
    
    return { jobId: job.job_id, messageId };
}

/**
 * Queue specific messages for scanning
 */
export async function queueMessageScan(params: {
    guildId: string;
    channelId: string;
    messageIds: string[];
}): Promise<{ jobId: string; messageId: string }> {
    const { guildId, channelId, messageIds } = params;
    
    const job: MessageScanJob = {
        job_id: randomUUID(),
        guild_id: guildId,
        channel_id: channelId,
        type: "message",
        message_ids: messageIds,
        created_at: new Date().toISOString(),
    };
    
    const messageId = await pushJob(job);
    
    return { jobId: job.job_id, messageId };
}

/**
 * Get stream info (for monitoring)
 */
export async function getStreamInfo(guildId: string, jobType: string): Promise<{
    length: number;
    exists: boolean;
}> {
    const redis = getRedis();
    const streamName = buildStreamName(guildId, jobType);
    
    try {
        const info = await redis.xinfo("STREAM", streamName) as any[];
        
        // Parse Redis response (array format)
        const length = info[1] as number;
        
        return { length, exists: true };
    } catch (error: any) {
        if (error.message?.includes("no such key")) {
            return { length: 0, exists: false };
        }
        throw error;
    }
}
