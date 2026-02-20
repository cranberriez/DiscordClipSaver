"use client";

import { useSetupStoreHydrated } from "../stores/useSetupStore";
import { useGuild } from "@/lib/hooks";

/**
 * Hook to determine if setup is required for a guild
 *
 * @param guildId - The guild ID to check
 * @returns Object with setup status information
 */
export function useSetupRequired(guildId: string) {
	const { data: guild } = useGuild(guildId);
	const {
		guildId: storeGuildId,
		isSetupComplete,
		currentStep,
		getCompletedStepsCount,
	} = useSetupStoreHydrated();

	// If we don't have guild data yet, assume setup is not required
	if (!guild) {
		return {
			isSetupRequired: false,
			isSetupInProgress: false,
			isSetupComplete: false,
			setupProgress: 0,
			currentStep: null,
			shouldRedirectToSetup: false,
		};
	}

	// Check if this guild has basic scanning enabled
	const hasBasicSetup = guild.message_scan_enabled;

	// Check if we have setup state for this guild
	const hasSetupState = storeGuildId === guildId;
	const setupInProgress = hasSetupState && !isSetupComplete;
	const setupProgress = hasSetupState ? getCompletedStepsCount() : 0;

	// Setup is required if:
	// 1. Guild doesn't have scanning enabled, OR
	// 2. We have incomplete setup state for this guild
	const isSetupRequired =
		!hasBasicSetup || (hasSetupState && !isSetupComplete);

	// Should redirect to setup if setup is required and not already in progress
	const shouldRedirectToSetup = isSetupRequired && !setupInProgress;

	return {
		isSetupRequired,
		isSetupInProgress: setupInProgress,
		isSetupComplete: hasBasicSetup && (!hasSetupState || isSetupComplete),
		setupProgress,
		currentStep: hasSetupState ? currentStep : null,
		shouldRedirectToSetup,
	};
}
