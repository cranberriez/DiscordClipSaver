import { api } from "@/lib/api/client";

export type ChannelType = "text" | "voice" | "category" | "forum";

export interface Channel {
	id: string;
	guild_id: string;
	name: string;
	type: ChannelType;
	position: number;
	parent_id: string | null;
	nsfw: boolean;
	clip_count?: number;
	message_scan_enabled: boolean;
	last_channel_sync_at: Date | null;
	next_allowed_channel_sync_at: Date | null;
	channel_sync_cooldown_level: number;
	purge_cooldown: Date | null;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
}

/**
 * Response from GET /api/guilds/[guildId]/channels
 */
export interface ChannelsListResponse {
	channels: Channel[];
}

/**
 * Channel with clip count for statistics
 */
export type ChannelWithStats = Channel & { clip_count: number };

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
	return res;
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
