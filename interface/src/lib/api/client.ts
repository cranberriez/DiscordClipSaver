/**
 * Type-safe API Client
 *
 * Centralized API client for making requests to our Next.js API routes.
 * Uses Kysely-generated types for full type safety.
 */

import { signOut } from "next-auth/react";
import type {
    GuildSettingsResponse,
    ScanStatusesResponse,
    SingleScanStatusResponse,
} from "../types/types";
import type { Guild } from "@/lib/db/types";
import { GuildsListResponse, ToggleScanningResponse } from "./guild";
import { UpdateGuildSettingsPayload } from "../schema/guild-settings.schema";
import { ChannelsListResponse, ChannelStatsResponse } from "./channels";

// ============================================================================
// Error Handling
// ============================================================================

export class APIError extends Error {
    constructor(message: string, public status: number, public data?: unknown) {
        super(message);
        this.name = "APIError";
    }
}

// ============================================================================
// Base Request Function
// ============================================================================

async function apiRequest<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(endpoint, {
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        credentials: "include", // Include cookies for NextAuth
        ...options,
    });

    // Handle authentication errors
    if (response.status === 401) {
        // Session expired or invalid - sign out and redirect
        await signOut({ callbackUrl: "/dashboard" });
        throw new APIError("Authentication required", 401);
    }

    if (response.status === 403) {
        // Authenticated but not authorized
        throw new APIError("Access denied", 403);
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
            errorData.error || "Request failed",
            response.status,
            errorData
        );
    }

    return response.json();
}

// ============================================================================
// API Client
// ============================================================================

export const api = {
    // ========================================================================
    // Guilds
    // ========================================================================
    guilds: {
        /**
         * Get list of user's guilds from Discord with optional DB enrichment
         * GET /api/discord/user/guilds?includeDb=1
         */
        list: () =>
            apiRequest<GuildsListResponse[]>(
                "/api/discord/user/guilds?includeDb=1"
            ),

        /**
         * Get a single guild by ID from the database
         * Note: This uses the DB query directly, not an API route
         * For API route version, you'd need to create one
         */
        get: async (guildId: string): Promise<Guild> => {
            // This would need a dedicated API route
            // For now, we'll use the existing pattern from your code
            throw new Error(
                "Not implemented - use direct DB query in Server Component"
            );
        },

        /**
         * Toggle message scanning for a guild
         * POST /api/guilds/[guildId]/toggle
         */
        toggleScanning: (guildId: string, enabled: boolean) =>
            apiRequest<ToggleScanningResponse>(
                `/api/guilds/${guildId}/toggle`,
                {
                    method: "POST",
                    body: JSON.stringify({ enabled }),
                }
            ),
    },

    // ========================================================================
    // Channels
    // ========================================================================
    channels: {
        /**
         * Get all channels for a guild
         * GET /api/guilds/[guildId]/channels
         */
        list: (guildId: string) =>
            apiRequest<ChannelsListResponse>(`/api/guilds/${guildId}/channels`),

        /**
         * Get all channels with clip counts for a guild
         * GET /api/guilds/[guildId]/channels/stats
         */
        stats: (guildId: string) =>
            apiRequest<ChannelStatsResponse>(
                `/api/guilds/${guildId}/channels/stats`
            ),

        /**
         * Bulk enable/disable all channels for a guild
         * POST /api/guilds/[guildId]/channels/bulk
         */
        bulkUpdate: (guildId: string, enabled: boolean) =>
            apiRequest<{
                success: boolean;
                updated_count: number;
                enabled: boolean;
            }>(`/api/guilds/${guildId}/channels/bulk`, {
                method: "POST",
                body: JSON.stringify({ enabled }),
            }),
    },

    // ========================================================================
    // Scans
    // ========================================================================
    scans: {
        /**
         * Get scan statuses for all channels in a guild
         * GET /api/guilds/[guildId]/scan-statuses
         */
        statuses: (guildId: string) =>
            apiRequest<ScanStatusesResponse>(
                `/api/guilds/${guildId}/scan-statuses`
            ),

        /**
         * Get scan status for a single channel
         * GET /api/guilds/[guildId]/channels/[channelId]/scan-status
         */
        status: (guildId: string, channelId: string) =>
            apiRequest<SingleScanStatusResponse>(
                `/api/guilds/${guildId}/channels/${channelId}/scan-status`
            ),

        /**
         * Start a scan for a channel (using server action)
         * This is handled by the server action, not an API route
         */
        // start: Use the server action directly: startChannelScan()
    },

    // ========================================================================
    // Settings
    // ========================================================================
    settings: {
        /**
         * Get guild settings
         * GET /api/guilds/[guildId]/settings
         */
        get: (guildId: string) =>
            apiRequest<GuildSettingsResponse>(
                `/api/guilds/${guildId}/settings`
            ),

        /**
         * Update guild settings (partial update)
         * PATCH /api/guilds/[guildId]/settings
         */
        update: (guildId: string, payload: UpdateGuildSettingsPayload) =>
            apiRequest<GuildSettingsResponse>(
                `/api/guilds/${guildId}/settings`,
                {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                }
            ),
    },
};
