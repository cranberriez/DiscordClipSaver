"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { guildSettingsQuery, settingsKeys } from "@/lib/queries/setting";
import { updateGuildSettings } from "@/lib/api/setting";
import type {
	GuildSettings,
	DefaultChannelSettings,
} from "@/lib/schema/guild-settings.schema";
import type { UpdateGuildSettingsPayload } from "@/lib/api/setting";

// ============================================================================
// Query Hook
// ============================================================================

/**
 * Fetch guild settings
 */
export function useGuildSettings(guildId: string) {
	return useQuery(guildSettingsQuery(guildId));
}

// ============================================================================
// Mutation Hook
// ============================================================================

/**
 * Update guild settings mutation
 */
export function useUpdateGuildSettings(guildId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateGuildSettingsPayload) =>
			updateGuildSettings(guildId, payload),

		onSuccess: (data) => {
			// Update cache with new data
			queryClient.setQueryData(settingsKeys.guild(guildId), data);
		},

		onError: (error) => {
			console.error("Failed to update settings:", error);
		},
	});
}

// ============================================================================
// Combined Hook with Local State (for forms)
// ============================================================================

/**
 * Combined hook for managing guild settings with local state tracking.
 * Useful for forms that need to track changes before saving.
 */
export function useGuildSettingsForm(guildId: string) {
	const queryClient = useQueryClient();

	// Fetch settings from server
	const {
		data: serverData,
		isLoading,
		error: queryError,
		refetch,
	} = useGuildSettings(guildId);

	// Update mutation
	const updateMutation = useUpdateGuildSettings(guildId);

	// Local working state (server + pending changes)
	const [localSettings, setLocalSettings] = useState<GuildSettings | null>(
		null
	);
	const [localChannelSettings, setLocalChannelSettings] =
		useState<DefaultChannelSettings | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	// Sync server data to local state when it loads
	useEffect(() => {
		if (serverData && !hasChanges) {
			setLocalSettings(serverData.settings as GuildSettings | null);
			setLocalChannelSettings(
				serverData.default_channel_settings as DefaultChannelSettings | null
			);
		}
	}, [serverData, hasChanges]);

	// Update a guild setting
	const setGuildSetting = <K extends keyof GuildSettings>(
		key: K,
		value: GuildSettings[K]
	) => {
		setLocalSettings(
			(prev) => ({ ...prev, [key]: value }) as GuildSettings
		);
		setHasChanges(true);
	};

	// Update a default channel setting
	const setDefaultChannelSetting = <K extends keyof DefaultChannelSettings>(
		key: K,
		value: DefaultChannelSettings[K]
	) => {
		setLocalChannelSettings(
			(prev) => ({ ...prev, [key]: value }) as DefaultChannelSettings
		);
		setHasChanges(true);
	};

	// Save all changes
	const save = async () => {
		if (!hasChanges) return;

		await updateMutation.mutateAsync({
			guild_id: guildId,
			settings: localSettings ?? undefined,
			default_channel_settings: localChannelSettings ?? undefined,
		});

		setHasChanges(false);
	};

	// Reset to server state
	const reset = () => {
		setLocalSettings(serverData?.settings as GuildSettings | null);
		setLocalChannelSettings(
			serverData?.default_channel_settings as DefaultChannelSettings | null
		);
		setHasChanges(false);
	};

	// Reset to system defaults
	const resetToDefaults = async () => {
		await updateMutation.mutateAsync({
			guild_id: guildId,
			settings: {},
			default_channel_settings: {},
		});

		setHasChanges(false);
	};

	return {
		// Current state (includes pending changes)
		settings: localSettings,
		defaultChannelSettings: localChannelSettings,

		// Status
		loading: isLoading,
		saving: updateMutation.isPending,
		error: queryError?.message ?? null,
		hasChanges,

		// Actions
		setGuildSetting,
		setDefaultChannelSetting,
		save,
		reset,
		resetToDefaults,
		refresh: refetch,
	};
}
