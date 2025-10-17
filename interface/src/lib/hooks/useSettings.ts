"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { guildKeys } from "@/lib/queries";
import { GuildSettingsBuilder } from "@/lib/react-query/guild-settings-builder";
import type {
    GuildSettings,
    DefaultChannelSettings,
} from "@/lib/validation/guild-settings.schema";

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch guild settings.
 *
 * This is a simpler query-only version. For the full builder pattern,
 * use useGuildSettingsWithBuilder below.
 */
export function useGuildSettings(guildId: string) {
    return useQuery({
        queryKey: guildKeys.settings(guildId),
        queryFn: () => api.settings.get(guildId),
        enabled: !!guildId,
    });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update guild settings mutation.
 */
export function useUpdateGuildSettings(guildId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: {
            settings?: Record<string, unknown>;
            default_channel_settings?: Record<string, unknown>;
        }) =>
            api.settings.update(guildId, {
                guild_id: guildId,
                ...payload,
            }),

        onSuccess: data => {
            // Update cache with new data
            queryClient.setQueryData(guildKeys.settings(guildId), data);
        },

        onError: error => {
            console.error("Failed to update settings:", error);
        },
    });
}

// ============================================================================
// Combined Hook with Builder Pattern (replaces old useGuildSettings)
// ============================================================================

export interface UseGuildSettingsReturn {
    // Current settings (includes pending changes)
    settings: GuildSettings | null;
    defaultChannelSettings: DefaultChannelSettings | null;

    // Builder for collecting changes
    builder: GuildSettingsBuilder;

    // State
    loading: boolean;
    saving: boolean;
    error: string | null;
    hasChanges: boolean;

    // Actions
    refresh: () => void;
    save: () => Promise<void>;
    reset: () => void;
    resetToDefaults: () => Promise<void>;

    // Convenience setters
    setGuildSetting: <K extends keyof GuildSettings>(
        key: K,
        value: GuildSettings[K]
    ) => void;
    setDefaultChannelSetting: <K extends keyof DefaultChannelSettings>(
        key: K,
        value: DefaultChannelSettings[K]
    ) => void;
}

/**
 * Full-featured guild settings hook with builder pattern.
 *
 * This replaces the old useGuildSettings hook and provides the same API,
 * but uses TanStack Query under the hood.
 *
 * @example
 * ```tsx
 * function GuildSettingsPage({ guildId }: { guildId: string }) {
 *   const {
 *     settings,
 *     defaultChannelSettings,
 *     loading,
 *     saving,
 *     error,
 *     hasChanges,
 *     setGuildSetting,
 *     save,
 *     reset,
 *   } = useGuildSettingsWithBuilder(guildId);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); save(); }}>
 *       <input
 *         value={settings?.tz ?? 'UTC'}
 *         onChange={(e) => setGuildSetting('tz', e.target.value)}
 *       />
 *       <button type="submit" disabled={!hasChanges || saving}>
 *         {saving ? 'Saving...' : 'Save'}
 *       </button>
 *       <button type="button" onClick={reset} disabled={!hasChanges}>
 *         Reset
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useGuildSettingsWithBuilder(
    guildId: string
): UseGuildSettingsReturn {
    const [builder] = useState(() => new GuildSettingsBuilder(guildId));

    // Fetch settings
    const {
        data: serverData,
        isLoading,
        error: queryError,
        refetch,
    } = useGuildSettings(guildId);

    // Update mutation
    const updateMutation = useUpdateGuildSettings(guildId);

    // Working state (server state + pending changes)
    const [workingSettings, setWorkingSettings] =
        useState<GuildSettings | null>(null);
    const [workingDefaultChannelSettings, setWorkingDefaultChannelSettings] =
        useState<DefaultChannelSettings | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Sync server data to working state when it changes
    useMemo(() => {
        if (serverData && !hasChanges) {
            setWorkingSettings(serverData.settings as GuildSettings | null);
            setWorkingDefaultChannelSettings(
                serverData.default_channel_settings as DefaultChannelSettings | null
            );
        }
    }, [serverData, hasChanges]);

    // Save changes
    const save = async () => {
        const payload = builder.build();
        if (!payload) return;

        try {
            await updateMutation.mutateAsync({
                settings: payload.settings,
                default_channel_settings: payload.default_channel_settings,
            });

            builder.clearAll();
            setHasChanges(false);
        } catch (err) {
            // Error is already logged by mutation
            throw err;
        }
    };

    // Reset pending changes
    const reset = () => {
        builder.clearAll();
        setWorkingSettings(serverData?.settings as GuildSettings | null);
        setWorkingDefaultChannelSettings(
            serverData?.default_channel_settings as DefaultChannelSettings | null
        );
        setHasChanges(false);
    };

    // Reset to system defaults
    const resetToDefaults = async () => {
        try {
            await updateMutation.mutateAsync({
                settings: {},
                default_channel_settings: {},
            });

            builder.clearAll();
            setHasChanges(false);
        } catch (err) {
            throw err;
        }
    };

    // Convenience setter for guild settings
    const setGuildSetting = <K extends keyof GuildSettings>(
        key: K,
        value: GuildSettings[K]
    ) => {
        builder.setGuildSetting(key, value);
        setWorkingSettings(
            prev => ({ ...prev, [key]: value } as GuildSettings)
        );
        setHasChanges(true);
    };

    // Convenience setter for default channel settings
    const setDefaultChannelSetting = <K extends keyof DefaultChannelSettings>(
        key: K,
        value: DefaultChannelSettings[K]
    ) => {
        builder.setDefaultChannelSetting(key, value);
        setWorkingDefaultChannelSettings(
            prev => ({ ...prev, [key]: value } as DefaultChannelSettings)
        );
        setHasChanges(true);
    };

    return {
        settings: workingSettings,
        defaultChannelSettings: workingDefaultChannelSettings,
        builder,
        loading: isLoading,
        saving: updateMutation.isPending,
        error: queryError?.message ?? null,
        hasChanges,
        refresh: () => {
            refetch();
        },
        save,
        reset,
        resetToDefaults,
        setGuildSetting,
        setDefaultChannelSetting,
    };
}
