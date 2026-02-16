/**
 * Type-safe API Client
 *
 * Centralized API client for making requests to our Next.js API routes.
 * Uses Kysely-generated types for full type safety.
 */

import { signOut } from "next-auth/react";
import type { GuildSettingsResponse } from "./setting";
import type { EnrichedDiscordGuild, Guild } from "@/lib/api/guild";
import {
    GuildResponse,
    GuildWithClipCount,
    GuildWithStats,
    GuildStatsOptions,
    ToggleScanningResponse,
} from "./guild";
import { UpdateGuildSettingsPayload } from "../schema/guild-settings.schema";
import { Channel, ChannelStatsResponse } from "./channel";
import {
    MultiScanResult,
    ScanResult,
    ScanStatus,
    StartScanOptions,
} from "./scan";
import { ClipListResponse, FullClip, ClipListParams } from "./clip";
import type { AuthorStatsResponse } from "./author";
import type {
    FavoriteStatusResponse,
    FavoriteBulkResponse,
    FavoriteToggleRequest,
} from "./favorites";

// ============================================================================
// Error Handling
// ============================================================================

export class APIError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: unknown
    ) {
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
         * Get list of user's guilds from DB optionally including permissions
         * GET /api/guilds/?includePerms=1
         */
        list: (withPerms?: boolean) =>
            apiRequest<GuildResponse[]>(
                `/api/guilds/?includePerms=${withPerms ? 1 : 0}`
            ),

        /**
         * Get list of user's guilds from Discord with optional DB enrichment
         * GET /api/discord/me/guilds/?includeDB=1
         */
        listDiscord: (withDB?: boolean) =>
            apiRequest<EnrichedDiscordGuild[]>(
                `/api/discord/me/guilds/?includeDB=${withDB ? 1 : 0}`
            ),

        /**
         * Get a single guild by ID from the database
         * GET /api/guilds/[guildId]
         */
        get: (guildId: string) => apiRequest<Guild>(`/api/guilds/${guildId}`),

        /**
         * Get list of user's guilds with clip counts
         * GET /api/guilds/?withClipCount=1
         */
        listWithClipCount: () =>
            apiRequest<GuildWithClipCount[]>("/api/guilds?withClipCount=1"),

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

        /**
         * Get stats for multiple guilds
         * GET /api/guilds/stats?guildIds=xxx,yyy&withClipCount=1&withAuthorCount=1
         */
        stats: (guildIds: string[], options?: GuildStatsOptions) => {
            const searchParams = new URLSearchParams();
            searchParams.set("guildIds", guildIds.join(","));
            if (options?.withClipCount) searchParams.set("withClipCount", "1");
            if (options?.withAuthorCount)
                searchParams.set("withAuthorCount", "1");

            return apiRequest<GuildWithStats[]>(
                `/api/guilds/stats?${searchParams.toString()}`
            );
        },
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
            apiRequest<Channel[]>(`/api/guilds/${guildId}/channels`),

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

        /**
         * Toggle message_scan_enabled for a single channel
         * POST /api/guilds/[guildId]/channels/[channelId]/toggle
         */
        toggleChannel: (guildId: string, channelId: string, enabled: boolean) =>
            apiRequest<{
                success: boolean;
                channelId: string;
                enabled: boolean;
            }>(`/api/guilds/${guildId}/channels/${channelId}/toggle`, {
                method: "POST",
                body: JSON.stringify({ enabled }),
            }),
    },

    // ========================================================================
    // Authors
    // ========================================================================
    authors: {
        /**
         * Get all authors with clip statistics for a guild
         * GET /api/guilds/[guildId]/authors/stats
         */
        stats: (guildId: string) =>
            apiRequest<AuthorStatsResponse>(
                `/api/guilds/${guildId}/authors/stats`
            ),
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
            apiRequest<ScanStatus[]>(`/api/guilds/${guildId}/scan-statuses`),

        /**
         * Get scan status for a single channel
         * GET /api/guilds/[guildId]/channels/[channelId]/scan-status
         */
        status: (guildId: string, channelId: string) =>
            apiRequest<ScanStatus>(
                `/api/guilds/${guildId}/channels/${channelId}/scan-status`
            ),

        /**
         * Start a scan for a channel (using server action)
         * This is handled by the server action, not an API route
         */
        start: (
            guildId: string,
            channelId: string,
            options?: StartScanOptions
        ) =>
            apiRequest<ScanResult>(`/api/guilds/${guildId}/scans/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channelIds: [channelId],
                    ...options,
                }),
            }),

        /**
         * Start scans for multiple channels
         */
        startBulk: (
            guildId: string,
            channelIds: string[],
            options?: StartScanOptions
        ) =>
            apiRequest<MultiScanResult>(`/api/guilds/${guildId}/scans/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channelIds,
                    ...options,
                }),
            }),
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

    // ========================================================================
    // Clips
    // ========================================================================
    clips: {
        /**
         * Get clips for a guild or specific channels/authors with pagination
         * GET /api/guilds/[guildId]/clips?channelIds=xxx,yyy&authorIds=aaa,bbb&limit=50&offset=0&sortOrder=desc&sortType=date&favorites=true
         */
        list: (params: ClipListParams) => {
            const searchParams = new URLSearchParams();
            if (params.channelIds && params.channelIds.length > 0)
                searchParams.set("channelIds", params.channelIds.join(","));
            if (params.authorIds && params.authorIds.length > 0)
                searchParams.set("authorIds", params.authorIds.join(","));
            if (params.limit)
                searchParams.set("limit", params.limit.toString());
            if (params.offset)
                searchParams.set("offset", params.offset.toString());
            if (params.sortOrder)
                searchParams.set("sortOrder", params.sortOrder);
            if (params.sortType) searchParams.set("sortType", params.sortType);
            if (params.favorites) searchParams.set("favorites", "true");

            const query = searchParams.toString();
            return apiRequest<ClipListResponse>(
                `/api/guilds/${params.guildId}/clips${query ? `?${query}` : ""}`
            );
        },

        /**
         * Get a single clip by ID with full metadata
         * Automatically refreshes expired CDN URLs on the server
         * GET /api/guilds/[guildId]/clips/[clipId]
         */
        get: (guildId: string, clipId: string) =>
            apiRequest<FullClip>(`/api/guilds/${guildId}/clips/${clipId}`),
    },

    // ========================================================================
    // Favorites
    // ========================================================================
    favorites: {
        /**
         * Check if a clip is favorited by the current user
         * GET /api/clips/[clipId]/favorite
         */
        status: (clipId: string) =>
            apiRequest<FavoriteStatusResponse>(`/api/clips/${clipId}/favorite`),

        /**
         * Add single clip to favorites
         * POST /api/clips/[clipId]/favorite
         */
        add: (clipId: string) =>
            apiRequest<FavoriteBulkResponse>(`/api/clips/${clipId}/favorite`, {
                method: "POST",
            }),

        /**
         * Add multiple clips to favorites
         * POST /api/clips/[clipId]/favorite with clipIds in body
         */
        addMultiple: (clipIds: string[]) => {
            // Use first clipId as URL param, all clipIds in body
            const primaryClipId = clipIds[0];
            return apiRequest<FavoriteBulkResponse>(
                `/api/clips/${primaryClipId}/favorite`,
                {
                    method: "POST",
                    body: JSON.stringify({ clipIds }),
                }
            );
        },

        /**
         * Remove single clip from favorites
         * DELETE /api/clips/[clipId]/favorite
         */
        remove: (clipId: string) =>
            apiRequest<FavoriteBulkResponse>(`/api/clips/${clipId}/favorite`, {
                method: "DELETE",
            }),

        /**
         * Remove multiple clips from favorites
         * DELETE /api/clips/[clipId]/favorite with clipIds in body
         */
        removeMultiple: (clipIds: string[]) => {
            // Use first clipId as URL param, all clipIds in body
            const primaryClipId = clipIds[0];
            return apiRequest<FavoriteBulkResponse>(
                `/api/clips/${primaryClipId}/favorite`,
                {
                    method: "DELETE",
                    body: JSON.stringify({ clipIds }),
                }
            );
        },

        /**
         * Toggle favorite status for a single clip
         * Uses the toggleFavorite database function
         */
        toggle: (clipId: string) =>
            apiRequest<FavoriteBulkResponse>(`/api/clips/${clipId}/favorite`, {
                method: "POST",
            }),
    },
};
