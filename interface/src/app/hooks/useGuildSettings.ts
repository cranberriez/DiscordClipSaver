"use client";

import { useState, useCallback, useEffect } from "react";
import { GuildSettingsBuilder } from "@/lib/settings/guild-settings-builder";
import {
    fetchGuildSettings,
    updateGuildSettings,
    type GuildSettingsResponse,
} from "@/lib/api/guild-settings";
import type {
    GuildSettings,
    DefaultChannelSettings,
} from "@/lib/validation/guild-settings.schema";

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
    refresh: () => Promise<void>;
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
 * React hook for managing guild settings.
 * 
 * This hook provides a complete interface for fetching, updating, and managing
 * guild settings with built-in state management and error handling.
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
 *     setDefaultChannelSetting,
 *     save,
 *     reset,
 *   } = useGuildSettings(guildId);
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 * 
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); save(); }}>
 *       <input
 *         value={settings?.tz ?? "UTC"}
 *         onChange={(e) => setGuildSetting("tz", e.target.value)}
 *       />
 *       <button type="submit" disabled={!hasChanges || saving}>
 *         {saving ? "Saving..." : "Save"}
 *       </button>
 *       <button type="button" onClick={reset} disabled={!hasChanges}>
 *         Reset
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useGuildSettings(guildId: string): UseGuildSettingsReturn {
    const [builder] = useState(() => new GuildSettingsBuilder(guildId));
    
    // Server state (original values from database)
    const [serverSettings, setServerSettings] = useState<GuildSettings | null>(null);
    const [serverDefaultChannelSettings, setServerDefaultChannelSettings] =
        useState<DefaultChannelSettings | null>(null);
    
    // Working state (server state + pending changes)
    const [workingSettings, setWorkingSettings] = useState<GuildSettings | null>(null);
    const [workingDefaultChannelSettings, setWorkingDefaultChannelSettings] =
        useState<DefaultChannelSettings | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch settings from server
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchGuildSettings(guildId);
            setServerSettings(response.settings);
            setServerDefaultChannelSettings(response.default_channel_settings);
            setWorkingSettings(response.settings);
            setWorkingDefaultChannelSettings(response.default_channel_settings);
            builder.clearAll();
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch settings");
        } finally {
            setLoading(false);
        }
    }, [guildId, builder]);

    // Save changes to server
    const save = useCallback(async () => {
        const payload = builder.build();
        if (!payload) return;

        setSaving(true);
        setError(null);
        try {
            const response = await updateGuildSettings(
                payload.guild_id,
                payload.settings,
                payload.default_channel_settings
            );
            setServerSettings(response.settings);
            setServerDefaultChannelSettings(response.default_channel_settings);
            setWorkingSettings(response.settings);
            setWorkingDefaultChannelSettings(response.default_channel_settings);
            builder.clearAll();
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save settings");
            throw err; // Re-throw so caller can handle if needed
        } finally {
            setSaving(false);
        }
    }, [builder, guildId]);

    // Reset pending changes (revert to server state)
    const reset = useCallback(() => {
        builder.clearAll();
        setWorkingSettings(serverSettings);
        setWorkingDefaultChannelSettings(serverDefaultChannelSettings);
        setHasChanges(false);
        setError(null);
    }, [builder, serverSettings, serverDefaultChannelSettings]);

    // Reset to system defaults (empty settings)
    const resetToDefaults = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const response = await updateGuildSettings(guildId, {}, {});
            setServerSettings(response.settings);
            setServerDefaultChannelSettings(response.default_channel_settings);
            setWorkingSettings(response.settings);
            setWorkingDefaultChannelSettings(response.default_channel_settings);
            builder.clearAll();
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reset to defaults");
            throw err;
        } finally {
            setSaving(false);
        }
    }, [guildId, builder]);

    // Convenience setter for guild settings
    const setGuildSetting = useCallback(
        <K extends keyof GuildSettings>(key: K, value: GuildSettings[K]) => {
            builder.setGuildSetting(key, value);
            setWorkingSettings(prev => ({ ...prev, [key]: value } as GuildSettings));
            setHasChanges(true);
        },
        [builder]
    );

    // Convenience setter for default channel settings
    const setDefaultChannelSetting = useCallback(
        <K extends keyof DefaultChannelSettings>(
            key: K,
            value: DefaultChannelSettings[K]
        ) => {
            builder.setDefaultChannelSetting(key, value);
            setWorkingDefaultChannelSettings(prev => ({ ...prev, [key]: value } as DefaultChannelSettings));
            setHasChanges(true);
        },
        [builder]
    );

    // Fetch settings on mount
    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        settings: workingSettings,
        defaultChannelSettings: workingDefaultChannelSettings,
        builder,
        loading,
        saving,
        error,
        hasChanges,
        refresh,
        save,
        reset,
        resetToDefaults,
        setGuildSetting,
        setDefaultChannelSetting,
    };
}
