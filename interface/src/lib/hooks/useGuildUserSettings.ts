"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GuildUserSettings } from "@/lib/schema/guild-user-settings.schema";
import { defaultUserSettings } from "@/lib/schema/guild-user-settings.schema";

// ============================================================================
// API Functions
// ============================================================================

async function fetchGuildUserSettings(guildId: string): Promise<GuildUserSettings> {
	const response = await fetch(`/api/guilds/${guildId}/user-settings`);
	if (!response.ok) {
		throw new Error("Failed to fetch user settings");
	}
	const data = await response.json();
	
	// Merge with defaults to ensure all fields are present
	return { ...defaultUserSettings, ...data };
}

async function updateGuildUserSettings(
	guildId: string,
	settings: GuildUserSettings
): Promise<GuildUserSettings> {
	const response = await fetch(`/api/guilds/${guildId}/user-settings`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(settings),
	});

	if (!response.ok) {
		throw new Error("Failed to update user settings");
	}

	return response.json();
}

// ============================================================================
// Query Keys
// ============================================================================

export const userSettingsKeys = {
	all: ["user-settings"] as const,
	guild: (guildId: string) => [...userSettingsKeys.all, guildId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch guild user settings
 */
export function useGuildUserSettings(guildId: string) {
	return useQuery({
		queryKey: userSettingsKeys.guild(guildId),
		queryFn: () => fetchGuildUserSettings(guildId),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Update guild user settings mutation
 */
export function useUpdateGuildUserSettings(guildId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (settings: GuildUserSettings) =>
			updateGuildUserSettings(guildId, settings),

		onSuccess: (data) => {
			// Update cache with new data
			queryClient.setQueryData(userSettingsKeys.guild(guildId), data);
		},

		onError: (error) => {
			console.error("Failed to update user settings:", error);
		},
	});
}

/**
 * Combined hook for managing guild user settings with local state tracking.
 * Provides simple form state management with save/cancel functionality.
 */
export function useGuildUserSettingsForm(guildId: string) {
	// Fetch settings from server
	const {
		data: serverSettings,
		isLoading,
		error: queryError,
	} = useGuildUserSettings(guildId);

	// Update mutation
	const updateMutation = useUpdateGuildUserSettings(guildId);

	// Local form state
	const [formSettings, setFormSettings] = useState<GuildUserSettings>(defaultUserSettings);
	const [hasChanges, setHasChanges] = useState(false);

	// Sync server data to local state when it loads
	useEffect(() => {
		if (serverSettings && !hasChanges) {
			setFormSettings(serverSettings);
		}
	}, [serverSettings, hasChanges]);

	// Update a setting
	const updateSetting = <K extends keyof GuildUserSettings>(
		key: K,
		value: GuildUserSettings[K]
	) => {
		setFormSettings((prev) => ({ ...prev, [key]: value }));
		setHasChanges(true);
	};

	// Save all changes
	const save = async () => {
		if (!hasChanges) return;

		await updateMutation.mutateAsync(formSettings);
		setHasChanges(false);
	};

	// Cancel changes and reset to server state
	const cancel = () => {
		if (serverSettings) {
			setFormSettings(serverSettings);
		} else {
			setFormSettings(defaultUserSettings);
		}
		setHasChanges(false);
	};

	return {
		// Current form state
		settings: formSettings,

		// Status
		isLoading,
		isSaving: updateMutation.isPending,
		error: queryError?.message ?? updateMutation.error?.message ?? null,
		hasChanges,

		// Actions
		updateSetting,
		save,
		cancel,
	};
}
