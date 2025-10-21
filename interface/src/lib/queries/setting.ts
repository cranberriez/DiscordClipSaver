import { queryOptions } from "@tanstack/react-query";
import { getGuildSettings } from "../api/setting";
import type { GuildSettingsResponse } from "../api/setting";

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query keys for guild settings.
 * This ensures consistent cache keys across the app.
 */
export const settingsKeys = {
    all: ["settings"] as const,
    guild: (guildId: string) => [...settingsKeys.all, guildId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Query options for fetching guild settings
 */
export const guildSettingsQuery = (guildId: string) =>
    queryOptions<GuildSettingsResponse>({
        queryKey: settingsKeys.guild(guildId),
        queryFn: () => getGuildSettings(guildId),
        enabled: !!guildId,
        staleTime: 60_000,
    });
