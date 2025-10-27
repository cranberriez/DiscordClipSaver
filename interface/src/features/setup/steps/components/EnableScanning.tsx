"use client";

import type { Guild } from "@/lib/api/guild";
import { Step } from "./Step";
import { useToggleScanning, useBulkUpdateChannels } from "@/lib/hooks";
import { useEffect, useState } from "react";
import { useSetupStoreHydrated } from "../../stores/useSetupStore";
import { Button } from "@/components/ui/button";

export function EnableScanning({
    guild,
    onComplete,
    shouldStart = false,
}: {
    guild: Guild;
    onComplete: () => void;
    shouldStart?: boolean;
}) {
    const [currentTask, setCurrentTask] = useState<string>("");
    const toggleMutation = useToggleScanning(guild.id);
    const toggleChannelMutation = useBulkUpdateChannels(guild.id);

    const { startStep, updateStepState, completeStep, getStepData } =
        useSetupStoreHydrated();

    const stepData = getStepData("enable_scanning");

    // Start the step when shouldStart becomes true
    useEffect(() => {
        if (shouldStart && stepData.state === null) {
            startEnableScanning();
        }
    }, [shouldStart, stepData.state]);

    const startEnableScanning = async () => {
        try {
            startStep("enable_scanning");

            // Step 1: Enable scanning for the guild
            setCurrentTask("Enabling scanning for guild...");
            await toggleMutation.mutateAsync(true);

            // Step 2: Enable all channels
            setCurrentTask("Enabling scanning for all channels...");
            await toggleChannelMutation.mutateAsync(true);

            // Complete the step
            setCurrentTask("Setup complete!");
            completeStep("enable_scanning");

            // Notify parent that this step is complete
            setTimeout(() => {
                onComplete();
            }, 1000);
        } catch (error) {
            console.error("Failed to enable scanning:", error);
            updateStepState(
                "enable_scanning",
                "error",
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred"
            );
        }
    };

    const getStepContent = () => {
        // Debug logging
        console.log("EnableScanning render:", {
            stepDataState: stepData.state,
            shouldStart,
            currentTask,
        });

        if (stepData.state === null) {
            return (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        This step will enable message scanning for your guild
                        and configure all channels to be scanned for clips.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Enable scanning for the guild</div>
                        <div>• Enable scanning for all channels</div>
                    </div>
                    {shouldStart && (
                        <div className="text-xs text-blue-600 mt-2">
                            Ready to start...
                        </div>
                    )}
                </div>
            );
        }

        if (stepData.state === "loading") {
            return (
                <div className="space-y-2">
                    <p className="text-sm font-medium">{currentTask}</p>
                    <div className="text-xs text-muted-foreground">
                        Please wait while we configure your guild...
                    </div>
                </div>
            );
        }

        if (stepData.state === "success") {
            return (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600">
                        Scanning enabled successfully!
                    </p>
                    <div className="text-xs text-muted-foreground">
                        Your guild and all channels are now configured for clip
                        scanning.
                    </div>
                </div>
            );
        }

        if (stepData.state === "error") {
            return (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600">
                        Failed to enable scanning
                    </p>
                    {stepData.error && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                            {stepData.error}
                        </div>
                    )}
                    <Button
                        onClick={startEnableScanning}
                        disabled={
                            toggleMutation.isPending ||
                            toggleChannelMutation.isPending
                        }
                    >
                        Retry
                    </Button>
                </div>
            );
        }

        return null;
    };

    return (
        <Step title="Enable Scanning" state={stepData.state}>
            {getStepContent()}
        </Step>
    );
}
