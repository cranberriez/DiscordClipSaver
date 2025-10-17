"use server";

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query keys for guilds and related data.
 * This ensures consistent cache keys across the app.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */
export const guildKeys = {
    all: ["guilds"] as const,
    lists: () => [...guildKeys.all, "list"] as const,
    list: (filters?: unknown) => [...guildKeys.lists(), filters] as const,
    details: () => [...guildKeys.all, "detail"] as const,
    detail: (id: string) => [...guildKeys.details(), id] as const,
    channels: (id: string) => [...guildKeys.detail(id), "channels"] as const,
    channelStats: (id: string) =>
        [...guildKeys.detail(id), "channel-stats"] as const,
    scanStatuses: (id: string) =>
        [...guildKeys.detail(id), "scan-statuses"] as const,
    settings: (id: string) => [...guildKeys.detail(id), "settings"] as const,
};
