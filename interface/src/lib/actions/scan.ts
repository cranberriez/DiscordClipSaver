/**
 * Server actions for channel scanning
 */
"use server";

import { startBatchScan } from "../redis/jobs";
import { getChannelScanStatus } from "../db/queries/scan_status";
import { getChannelsByGuildId } from "../db/queries/channels";
import { getSingleGuildById } from "../db/queries/guilds";

export type ScanResult =
    | { success: true; jobId: string; messageId: string }
    | { success: false; error: string };

/**
 * Start a batch scan for a channel
 */
export async function startChannelScan(
    guildId: string,
    channelId: string,
    options?: {
        direction?: "forward" | "backward";
        limit?: number;
        autoContinue?: boolean;
    }
): Promise<ScanResult> {
    try {
        // Validate guild exists
        const guild = await getSingleGuildById(guildId);
        if (!guild) {
            return { success: false, error: "Guild not found" };
        }

        // Get all channels for this guild
        const channels = await getChannelsByGuildId(guildId);

        // Find the specific channel
        const channel = channels.find(c => c.id === channelId);

        if (!channel) {
            return { success: false, error: "Channel not found" };
        }

        if (!channel.message_scan_enabled) {
            return {
                success: false,
                error: "Message scanning is disabled for this channel",
            };
        }

        // Check if scan is already running
        const existingStatus = await getChannelScanStatus(guildId, channelId);

        if (existingStatus?.status === "RUNNING") {
            return {
                success: false,
                error: "Scan is already running for this channel",
            };
        }

        // Start the scan
        const { jobId, messageId } = await startBatchScan({
            guildId,
            channelId,
            direction: options?.direction || "backward",
            limit: options?.limit || 100,
            autoContinue: options?.autoContinue ?? true,
        });

        return { success: true, jobId, messageId };
    } catch (error) {
        console.error("Failed to start channel scan:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Start scans for multiple channels
 */
export async function startMultipleChannelScans(
    guildId: string,
    channelIds: string[],
    options?: {
        direction?: "forward" | "backward";
        limit?: number;
        autoContinue?: boolean;
    }
): Promise<{
    success: number;
    failed: number;
    results: Array<{ channelId: string; result: ScanResult }>;
}> {
    const results = await Promise.all(
        channelIds.map(async channelId => ({
            channelId,
            result: await startChannelScan(guildId, channelId, options),
        }))
    );

    const success = results.filter(r => r.result.success).length;
    const failed = results.filter(r => !r.result.success).length;

    return { success, failed, results };
}
