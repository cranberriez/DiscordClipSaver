"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SetupStepState } from "../steps/types";
import { useEffect, useState } from "react";

export type SetupStep = 
    | "discover_channels"
    | "enable_scanning"
    | "configure_channels" 
    | "initial_scan"
    | "setup_webhooks"
    | "configure_permissions"
    | "test_functionality"
    | "finalize_setup"
    | "complete";

export interface SetupStepData {
    id: SetupStep;
    title: string;
    description: string;
    state: SetupStepState;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}

export interface SetupState {
    guildId: string | null;
    currentStep: SetupStep;
    steps: Record<SetupStep, SetupStepData>;
    isSetupComplete: boolean;
    
    // Actions
    initializeSetup: (guildId: string) => void;
    startStep: (step: SetupStep) => void;
    updateStepState: (step: SetupStep, state: SetupStepState, error?: string) => void;
    completeStep: (step: SetupStep) => void;
    nextStep: () => void;
    resetSetup: () => void;
    
    // Getters
    getCurrentStepData: () => SetupStepData;
    getStepData: (step: SetupStep) => SetupStepData;
    isStepActive: (step: SetupStep) => boolean;
    isStepCompleted: (step: SetupStep) => boolean;
    getCompletedStepsCount: () => number;
    getTotalStepsCount: () => number;
}

const STEP_ORDER: SetupStep[] = [
    "discover_channels",
    "enable_scanning",
    "configure_channels",
    "initial_scan", 
    "setup_webhooks",
    "configure_permissions",
    "test_functionality",
    "finalize_setup",
    "complete"
];

const DEFAULT_STEPS: Record<SetupStep, Omit<SetupStepData, "state">> = {
    discover_channels: {
        id: "discover_channels",
        title: "Discover Channels",
        description: "Find all channels in your Discord server"
    },
    enable_scanning: {
        id: "enable_scanning",
        title: "Enable Scanning",
        description: "Enable message scanning for the guild and configure channels"
    },
    configure_channels: {
        id: "configure_channels", 
        title: "Configure Channels",
        description: "Select which channels should be scanned for clips"
    },
    initial_scan: {
        id: "initial_scan",
        title: "Initial Scan", 
        description: "Perform initial scan of selected channels"
    },
    setup_webhooks: {
        id: "setup_webhooks",
        title: "Setup Webhooks",
        description: "Configure Discord webhooks for notifications"
    },
    configure_permissions: {
        id: "configure_permissions",
        title: "Configure Permissions", 
        description: "Set up user permissions and access controls"
    },
    test_functionality: {
        id: "test_functionality",
        title: "Test Functionality",
        description: "Verify that all features are working correctly"
    },
    finalize_setup: {
        id: "finalize_setup",
        title: "Finalize Setup",
        description: "Complete the setup process and activate the bot"
    },
    complete: {
        id: "complete",
        title: "Setup Complete",
        description: "Your Discord Clip Saver is ready to use!"
    }
};

export const useSetupStore = create<SetupState>()(
    persist(
        (set, get) => ({
            guildId: null,
            currentStep: "discover_channels",
            steps: Object.fromEntries(
                Object.entries(DEFAULT_STEPS).map(([key, step]) => [
                    key,
                    { ...step, state: null }
                ])
            ) as Record<SetupStep, SetupStepData>,
            isSetupComplete: false,

            initializeSetup: (guildId: string) => {
                set({
                    guildId,
                    currentStep: "discover_channels",
                    isSetupComplete: false,
                    steps: Object.fromEntries(
                        Object.entries(DEFAULT_STEPS).map(([key, step]) => [
                            key,
                            { ...step, state: null }
                        ])
                    ) as Record<SetupStep, SetupStepData>
                });
            },

            startStep: (step: SetupStep) => {
                set(state => ({
                    steps: {
                        ...state.steps,
                        [step]: {
                            ...state.steps[step],
                            state: "loading",
                            startedAt: new Date(),
                            error: undefined
                        }
                    }
                }));
            },

            updateStepState: (step: SetupStep, stepState: SetupStepState, error?: string) => {
                set(state => ({
                    steps: {
                        ...state.steps,
                        [step]: {
                            ...state.steps[step],
                            state: stepState,
                            error: stepState === "error" ? error : undefined
                        }
                    }
                }));
            },

            completeStep: (step: SetupStep) => {
                set(state => ({
                    steps: {
                        ...state.steps,
                        [step]: {
                            ...state.steps[step],
                            state: "success",
                            completedAt: new Date(),
                            error: undefined
                        }
                    }
                }));
            },

            nextStep: () => {
                const { currentStep } = get();
                const currentIndex = STEP_ORDER.indexOf(currentStep);
                
                if (currentIndex < STEP_ORDER.length - 1) {
                    const nextStep = STEP_ORDER[currentIndex + 1];
                    set({ 
                        currentStep: nextStep,
                        isSetupComplete: nextStep === "complete"
                    });
                }
            },

            resetSetup: () => {
                set({
                    guildId: null,
                    currentStep: "discover_channels",
                    isSetupComplete: false,
                    steps: Object.fromEntries(
                        Object.entries(DEFAULT_STEPS).map(([key, step]) => [
                            key,
                            { ...step, state: null }
                        ])
                    ) as Record<SetupStep, SetupStepData>
                });
            },

            getCurrentStepData: () => {
                const { currentStep, steps } = get();
                return steps[currentStep];
            },

            getStepData: (step: SetupStep) => {
                const { steps } = get();
                return steps[step];
            },

            isStepActive: (step: SetupStep) => {
                const { currentStep } = get();
                return currentStep === step;
            },

            isStepCompleted: (step: SetupStep) => {
                const { steps } = get();
                return steps[step].state === "success";
            },

            getCompletedStepsCount: () => {
                const { steps } = get();
                return Object.values(steps).filter(step => step.state === "success").length;
            },

            getTotalStepsCount: () => {
                return STEP_ORDER.length - 1; // Exclude "complete" step from count
            }
        }),
        {
            name: "discord-clip-saver-setup",
            partialize: (state) => ({
                guildId: state.guildId,
                currentStep: state.currentStep,
                steps: state.steps,
                isSetupComplete: state.isSetupComplete
            }),
            // Skip hydration during SSR to prevent hydration mismatches
            skipHydration: true
        }
    )
);

/**
 * Hook to safely use the setup store with proper hydration handling.
 * This prevents hydration mismatches by ensuring the store is only used after client-side hydration.
 */
export function useSetupStoreHydrated() {
    const [isHydrated, setIsHydrated] = useState(false);
    const store = useSetupStore();

    useEffect(() => {
        // Manually trigger hydration after component mounts
        useSetupStore.persist.rehydrate();
        setIsHydrated(true);
    }, []);

    // Return default values during SSR/hydration to prevent mismatches
    if (!isHydrated) {
        return {
            guildId: null,
            currentStep: "discover_channels" as SetupStep,
            steps: Object.fromEntries(
                Object.entries(DEFAULT_STEPS).map(([key, step]) => [
                    key,
                    { ...step, state: null }
                ])
            ) as Record<SetupStep, SetupStepData>,
            isSetupComplete: false,
            
            // Provide no-op functions during hydration
            initializeSetup: () => {},
            startStep: () => {},
            updateStepState: () => {},
            completeStep: () => {},
            nextStep: () => {},
            resetSetup: () => {},
            getCurrentStepData: () => ({ 
                id: "discover_channels" as SetupStep, 
                title: "Discover Channels", 
                description: "", 
                state: null 
            }),
            getStepData: () => ({ 
                id: "discover_channels" as SetupStep, 
                title: "Discover Channels", 
                description: "", 
                state: null 
            }),
            isStepActive: () => false,
            isStepCompleted: () => false,
            getCompletedStepsCount: () => 0,
            getTotalStepsCount: () => 7
        };
    }

    return store;
}
