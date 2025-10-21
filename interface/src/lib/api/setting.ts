import { api } from "./client";

// ============================================================================
// Types
// ============================================================================

/**
 * Response from GET /api/guilds/[guildId]/settings
 * Response from PATCH /api/guilds/[guildId]/settings
 */
export interface GuildSettingsResponse {
    guild_id: string;
    settings: Record<string, unknown> | null;
    default_channel_settings: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
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
// API Functions
// ============================================================================

/**
 * Get guild settings
 */
export function getGuildSettings(guildId: string) {
    return api.settings.get(guildId);
}

/**
 * Update guild settings (partial update)
 */
export function updateGuildSettings(
    guildId: string,
    payload: UpdateGuildSettingsPayload
) {
    return api.settings.update(guildId, payload);
}
