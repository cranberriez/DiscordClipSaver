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
		getStepData,
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
			<Badge
				variant="default"
				className="border-green-200 bg-green-100 text-green-800"
			>
				<CheckCircle className="mr-1 h-3 w-3" />
				Setup Complete
			</Badge>
		);
	}

	if (compact) {
		return (
			<Badge variant="secondary">
				<Clock className="mr-1 h-3 w-3" />
				Setup {completedSteps}/{totalSteps}
			</Badge>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Badge variant="secondary">
					<Clock className="mr-1 h-3 w-3" />
					Setup in Progress
				</Badge>
				<span className="text-muted-foreground text-sm">
					{completedSteps}/{totalSteps} steps completed
				</span>
			</div>

			<div className="text-muted-foreground text-xs">
				Current: {currentStepData.title}
				{currentStepData.state === "error" && (
					<span className="ml-2 text-red-500">
						<AlertCircle className="mr-1 inline h-3 w-3" />
						Error
					</span>
				)}
			</div>

			{/* Progress bar */}
			<div className="h-2 w-full rounded-full bg-gray-200">
				<div
					className="h-2 rounded-full bg-blue-600 transition-all duration-300"
					style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
				/>
			</div>
		</div>
	);
}
