"use client";

import { useSetupStoreHydrated } from "../stores/useSetupStore";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface SetupStatusProps {
    guildId: string;
    compact?: boolean;
}

export function SetupStatus({ guildId, compact = false }: SetupStatusProps) {
    const { 
        guildId: storeGuildId, 
        isSetupComplete, 
        currentStep, 
        getCompletedStepsCount, 
        getTotalStepsCount,
        getStepData 
    } = useSetupStoreHydrated();

    // Don't show anything if this isn't the guild we're tracking
    if (storeGuildId !== guildId) {
        return null;
    }

    const completedSteps = getCompletedStepsCount();
    const totalSteps = getTotalStepsCount();
    const currentStepData = getStepData(currentStep);

    if (isSetupComplete) {
        return (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Setup Complete
            </Badge>
        );
    }

    if (compact) {
        return (
            <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Setup {completedSteps}/{totalSteps}
            </Badge>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Setup in Progress
                </Badge>
                <span className="text-sm text-muted-foreground">
                    {completedSteps}/{totalSteps} steps completed
                </span>
            </div>
            
            <div className="text-xs text-muted-foreground">
                Current: {currentStepData.title}
                {currentStepData.state === "error" && (
                    <span className="text-red-500 ml-2">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Error
                    </span>
                )}
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                />
            </div>
        </div>
    );
}
