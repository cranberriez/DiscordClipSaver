"use client";

import type { Guild } from "@/lib/api/guild";
import { SimpleGuildInfo } from "./SimpleGuildInfo";
import { SetupProgress } from "./SetupProgress";
import { useEffect } from "react";
import {
	DiscoverChannels,
	EnableScanning,
	InitialScan,
	SetupComplete,
} from "../steps";
import { useSetupStoreHydrated } from "../stores/useSetupStore";
import {
	INITIAL_SCAN_STORAGE_KEY,
	INITIAL_SCAN_INITIATED_KEY,
} from "../steps/components/InitialScan";

export function SetupMain({ guild }: { guild: Guild }) {
	const {
		initializeSetup,
		currentStep,
		isStepActive,
		getCompletedStepsCount,
		getTotalStepsCount,
		nextStep,
		guildId,
		isSetupComplete,
		isHydrated,
	} = useSetupStoreHydrated();

	// Initialize setup for this guild if not already initialized
	// Also handles reset if server was purged (DB says disabled, but Store says complete)
	useEffect(() => {
		if (!isHydrated) return;

		// Case 1: Store is for a different guild
		if (guildId !== guild.id) {
			initializeSetup(guild.id);
			return;
		}

		// Case 2: Store says complete, but backend says disabled (Purge/Re-add case)
		if (isSetupComplete && !guild.message_scan_enabled) {
			console.log(
				"Detected setup state mismatch (Backend disabled, Store complete). Resetting setup..."
			);

			// Clear the specific initial scan keys from localStorage
			localStorage.removeItem(`${INITIAL_SCAN_STORAGE_KEY}-${guild.id}`);
			localStorage.removeItem(
				`${INITIAL_SCAN_INITIATED_KEY}-${guild.id}`
			);

			// Reset the store for this guild
			initializeSetup(guild.id);
		}
	}, [
		guild.id,
		guildId,
		initializeSetup,
		isSetupComplete,
		guild.message_scan_enabled,
		isHydrated,
	]);

	const handleStepComplete = () => {
		console.log("Step completed, current step:", currentStep);
		nextStep();
		console.log("After nextStep, new current step:", currentStep);
	};

	// Debug logging (removed to prevent infinite loop)

	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<SimpleGuildInfo guild={guild} />
				<div className="flex items-center gap-2">
					<SetupProgress
						finishedSteps={getCompletedStepsCount()}
						totalSteps={getTotalStepsCount()}
					/>
				</div>
			</div>

			{/* Steps */}
			<div className="flex flex-col gap-4">
				<DiscoverChannels
					guild={guild}
					onComplete={handleStepComplete}
					shouldStart={isStepActive("discover_channels")}
				/>

				<EnableScanning
					guild={guild}
					onComplete={handleStepComplete}
					shouldStart={isStepActive("enable_scanning")}
				/>

				<InitialScan
					guild={guild}
					onComplete={handleStepComplete}
					shouldStart={isStepActive("initial_scan")}
				/>

				{/* Setup Complete */}
				{currentStep === "complete" && <SetupComplete guild={guild} />}

				{/* Placeholder for future steps */}
				{currentStep !== "discover_channels" &&
					currentStep !== "enable_scanning" &&
					currentStep !== "initial_scan" &&
					currentStep !== "complete" && (
						<div className="bg-muted rounded-lg border p-4">
							<p className="text-muted-foreground text-sm">
								Current step: {currentStep}
							</p>
							<p className="text-muted-foreground mt-1 text-xs">
								More setup steps will be implemented here...
							</p>
						</div>
					)}
			</div>
		</div>
	);
}
