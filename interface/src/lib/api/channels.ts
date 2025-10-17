import type { Channel } from "@/lib/db/types";
import { api } from "@/lib/api/client";

/**
 * Response from GET /api/guilds/[guildId]/channels
 */
export interface ChannelsListResponse {
    channels: Channel[];
}

/**
 * Channel with clip count for statistics
 */
export interface ChannelWithStats {
    id: string;
    name: string;
    position: number;
    type: string;
    clip_count: number;
}

/**
 * Response from GET /api/guilds/[guildId]/channels/stats
 */
export type ChannelStatsResponse = ChannelWithStats[];

/**
 * Response from POST /api/guilds/[guildId]/channels/bulk
 */
export interface BulkUpdateChannelsResponse {
    success: boolean;
    updated_count: number;
    enabled: boolean;
}

// ========================================================================
// Server Actions
// ========================================================================
export async function listChannels(guildId: string): Promise<Channel[]> {
    const res = await api.channels.list(guildId); // GET /api/guilds/[guildId]/channels
    return res.channels;
}

export function listChannelsStats(
    guildId: string
): Promise<ChannelStatsResponse> {
    return api.channels.stats(guildId); // GET /api/guilds/[guildId]/channels/stats
}

export function bulkUpdateChannels(
    guildId: string,
    enabled: boolean
): Promise<BulkUpdateChannelsResponse> {
    return api.channels.bulkUpdate(guildId, enabled); // POST /api/guilds/[guildId]/channels/bulk
}
