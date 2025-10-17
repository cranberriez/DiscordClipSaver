/**
 * API Response Types
 *
 * These types define the shape of responses from our API routes.
 * They use the Kysely-generated types from @/lib/db/types as the foundation.
 */

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
