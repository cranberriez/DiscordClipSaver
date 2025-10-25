/**
 * Server actions for channel scanning
 */
"use server";

import { startBatchScan } from "../redis/jobs";
import {
    getChannelScanStatus,
    upsertChannelScanStatus,
} from "@/server/db/queries/scan_status";
import { getChannelById } from "@/server/db/queries/channels";
import { getSingleGuildById } from "@/server/db/queries/guilds";
import { getAuthInfo } from "@/server/auth";
import { cacheUserScopedGraceful } from "@/server/cache";
import { discordFetch } from "@/server/discord/discordClient";
import type { DiscordGuild } from "@/server/discord/types";

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
    // Authenticate user
    let authInfo;
    try {
        authInfo = await getAuthInfo();
    } catch {
        return { success: false, error: "Unauthorized" };
    }

    const { discordUserId, accessToken } = authInfo;
    if (!accessToken) {
        return { success: false, error: "Missing Discord token" };
    }

    // Check if user has access to this guild (with caching)
    const freshTtlMs = 60 * 60 * 1000; // 1 hour
    const staleTtlMs = 24 * 60 * 60 * 1000; // 24 hours

    let userGuilds: DiscordGuild[];
    try {
        userGuilds = await cacheUserScopedGraceful<DiscordGuild[]>(
            discordUserId,
            "discord:guilds",
            freshTtlMs,
            staleTtlMs,
            () => discordFetch<DiscordGuild[]>("/users/@me/guilds", accessToken)
        );
    } catch (err) {
        console.error("Failed to fetch user guilds:", err);
        return { success: false, error: "Failed to verify guild access" };
    }

    const hasAccess = userGuilds.some(g => g.id === guildId);
    if (!hasAccess) {
        return {
            success: false,
            error: "You do not have access to this guild",
        };
    }

    try {
        // Validate guild exists and check ownership
        const guild = await getSingleGuildById(guildId);
        if (!guild) {
            return { success: false, error: "Guild not found" };
        }

        // Require guild ownership for scan operations
        const isOwner = guild.owner_id === discordUserId;
        if (!isOwner) {
            return {
                success: false,
                error: "You must be the guild owner to perform this action",
            };
        }

        // Get all channels for this guild
        const channel = await getChannelById(guildId, channelId);

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
            existingStatus?.status === "QUEUED"
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

        // Upsert channel scan status to QUEUED (creates row if it doesn't exist)
        // This prevents the "unscanned" flash when the UI refetches before worker picks up job
        await upsertChannelScanStatus(guildId, channelId, {
            status: "QUEUED",
        });

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
    // Auth check is done in startChannelScan for each channel
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
