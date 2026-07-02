"use client";

import type { Guild } from "@/lib/api/guild";
import { SimpleGuildInfo } from "./SimpleGuildInfo";
import { SetupProgress } from "./SetupProgress";
import {
	DiscoverChannels,
	EnableScanning,
	InitialScan,
	SetupComplete,
} from "../steps";
import { useSetupFlow } from "../hooks/useSetupFlow";

/**
 * Setup wizard. All step state is derived from live server data via
 * useSetupFlow - nothing is persisted client-side, so the page works on
 * first load and can never loop.
 */
export function SetupMain({ guild: initialGuild }: { guild: Guild }) {
	const flow = useSetupFlow(initialGuild);

	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<SimpleGuildInfo guild={flow.guild} />
				<div className="flex items-center gap-2">
					<SetupProgress
						finishedSteps={flow.completedStepsCount}
						totalSteps={flow.totalStepsCount}
					/>
				</div>
			</div>

			{/* Steps */}
			<div className="flex flex-col gap-4">
				<DiscoverChannels discover={flow.discover} />
				<EnableScanning enable={flow.enable} />
				<InitialScan scan={flow.scan} />

				{flow.isComplete && <SetupComplete guild={flow.guild} />}
			</div>
		</div>
	);
}
