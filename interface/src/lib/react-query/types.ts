/**
 * API Response Types
 * 
 * These types define the shape of responses from our API routes.
 * They use the Kysely-generated types from @/lib/db/types as the foundation.
 */

import type { Guild, Channel, ChannelScanStatus } from '@/lib/db/types';
import type { DiscordGuild } from '@/lib/discord/types';

// ============================================================================
// Guild API Responses
// ============================================================================

/**
 * Response from GET /api/discord/user/guilds?includeDb=1
 */
export interface GuildsListResponse {
    guilds: DiscordGuild[];
    dbGuilds: Guild[];
}

/**
 * Response from POST /api/guilds/[guildId]/toggle
 */
export interface ToggleScanningResponse {
    success: boolean;
    enabled: boolean;
}

// ============================================================================
// Channel API Responses
// ============================================================================

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

// ============================================================================
// Scan Status API Responses
// ============================================================================

/**
 * Response from GET /api/guilds/[guildId]/scan-statuses
 */
export interface ScanStatusesResponse {
    statuses: ChannelScanStatus[];
}

/**
 * Response from GET /api/guilds/[guildId]/channels/[channelId]/scan-status
 */
export interface SingleScanStatusResponse {
    status: ChannelScanStatus | null;
}

// ============================================================================
// Settings API Responses
// ============================================================================

/**
 * Response from GET /api/guilds/[guildId]/settings
 * Response from PATCH /api/guilds/[guildId]/settings
 */
export interface GuildSettingsResponse {
    guild_id: string;
    settings: Record<string, unknown> | null;
    default_channel_settings: Record<string, unknown> | null;
}

/**
 * Payload for PATCH /api/guilds/[guildId]/settings
 */
export interface UpdateGuildSettingsPayload {
    guild_id: string;
    settings?: Record<string, unknown>;
    default_channel_settings?: Record<string, unknown>;
}

// ============================================================================
// Scan Action Responses (Server Actions)
// ============================================================================

/**
 * Response from startChannelScan server action
 */
export type ScanResult =
    | { success: true; jobId: string; messageId: string }
    | { success: false; error: string };

/**
 * Response from startMultipleChannelScans server action
 */
export interface MultiScanResult {
    success: number;
    failed: number;
    results: Array<{ channelId: string; result: ScanResult }>;
}

// ============================================================================
// Error Response
// ============================================================================

/**
 * Standard error response from API routes
 */
export interface APIErrorResponse {
    error: string;
    details?: unknown;
}
