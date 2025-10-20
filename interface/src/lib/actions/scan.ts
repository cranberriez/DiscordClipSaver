/**
 * Server actions for channel scanning
 */
"use server";

import { startBatchScan } from "../redis/jobs";
import { getChannelScanStatus } from "@/server/db/queries/scan_status";
import { getChannelsByGuildId } from "@/server/db/queries/channels";
import { getSingleGuildById } from "@/server/db/queries/guilds";

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
        isUpdate?: boolean; // If true, always scan forward from last position
        isHistorical?: boolean; // If true, force backward scan from beginning (no backward_message_id)
        limit?: number;
        autoContinue?: boolean;
        rescan?: "stop" | "continue" | "update"; // How to handle already-processed messages
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

        if (
            existingStatus?.status === "RUNNING" ||
            existingStatus?.status === "PENDING"
        ) {
            return {
                success: false,
                error: "Scan is already running for this channel",
            };
        }

        // Determine scan parameters based on flags and existing scan status
        const isUpdate = options?.isUpdate ?? false;
        const isHistorical = options?.isHistorical ?? false;
        const rescan = options?.rescan ?? "stop";
        let direction: "forward" | "backward";
        let afterMessageId: string | undefined;
        let beforeMessageId: string | undefined;

        if (isHistorical) {
            // Historical scan: backward from beginning, ignore existing backward_message_id
            direction = "backward";
            beforeMessageId = undefined; // Start from newest
            afterMessageId = undefined;
        } else if (isUpdate) {
            // Update scan: always forward from last known position
            direction = "forward";
            afterMessageId = existingStatus?.forward_message_id || undefined;
        } else {
            // Initial/continuation scan: use channel settings or continue from last position
            if (
                existingStatus?.forward_message_id ||
                existingStatus?.backward_message_id
            ) {
                // Has scan history - continue from where we left off
                // TODO: Read channel scan_mode setting to determine preferred direction
                // For now, default to forward continuation
                direction = "forward";
                afterMessageId = existingStatus.forward_message_id || undefined;
            } else {
                // First scan - use channel default scan_mode setting
                // TODO: Read from channel settings, for now default to forward
                direction = "forward";
            }
        }

        // Start the scan
        const { jobId, messageId } = await startBatchScan({
            guildId,
            channelId,
            direction,
            limit: options?.limit || 100,
            afterMessageId,
            beforeMessageId,
            autoContinue: options?.autoContinue ?? true,
            rescan,
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
        isUpdate?: boolean;
        isHistorical?: boolean;
        limit?: number;
        autoContinue?: boolean;
        rescan?: "stop" | "continue" | "update";
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
