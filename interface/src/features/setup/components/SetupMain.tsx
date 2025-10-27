"use client";

import type { Guild } from "@/lib/api/guild";
import { SimpleGuildInfo } from "./SimpleGuildInfo";
import { SetupProgress } from "./SetupProgress";
import { useEffect } from "react";
import { DiscoverChannels, EnableScanning, InitialScan, SetupComplete } from "../steps";
import { useSetupStoreHydrated } from "../stores/useSetupStore";
import { Button } from "@/components/ui/button";

export function SetupMain({ guild }: { guild: Guild }) {
    const {
        initializeSetup,
        currentStep,
        isStepActive,
        getCompletedStepsCount,
        getTotalStepsCount,
        nextStep,
        resetSetup,
        guildId,
    } = useSetupStoreHydrated();

    // Initialize setup for this guild if not already initialized
    useEffect(() => {
        if (guildId !== guild.id) {
            initializeSetup(guild.id);
        }
    }, [guild.id, guildId, initializeSetup]);

    const handleStepComplete = () => {
        console.log("Step completed, current step:", currentStep);
        nextStep();
        console.log("After nextStep, new current step:", currentStep);
    };

    // Debug logging (removed to prevent infinite loop)

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center gap-4">
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
                {currentStep === "complete" && (
                    <SetupComplete guild={guild} />
                )}

                {/* Placeholder for future steps */}
                {currentStep !== "discover_channels" &&
                    currentStep !== "enable_scanning" &&
                    currentStep !== "initial_scan" &&
                    currentStep !== "complete" && (
                        <div className="p-4 border rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">
                                Current step: {currentStep}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                More setup steps will be implemented here...
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
}
