import type { Channel } from "@/lib/api/channel";
import type { ScanStatus } from "@/lib/api/scan";
import type { ChannelWithStatus } from "../types";

/**
 * Merges all channels with their scan statuses.
 * 
 * Channels without scan statuses will have `scanStatus: null`.
 * This ensures ALL channels are shown in the scans table, not just
 * channels that have been scanned before.
 * 
 * @param channels - All channels from the guild
 * @param scanStatuses - Scan statuses from the database
 * @returns Array of channels with their scan status (or null)
 */
export function mergeChannelsWithStatuses(
    channels: Channel[],
    scanStatuses: ScanStatus[]
): ChannelWithStatus[] {
    // Create a map for O(1) lookup of scan statuses by channel_id
    const statusMap = new Map<string, ScanStatus>();
    for (const status of scanStatuses) {
        statusMap.set(status.channel_id, status);
    }

    // Map all channels to ChannelWithStatus, merging in scan status if it exists
    return channels.map(channel => ({
        ...channel,
        scanStatus: statusMap.get(channel.id) ?? null,
    }));
}
