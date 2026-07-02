"use client";

import { Step } from "./Step";
import { Button } from "@/components/ui/button";
import type { SetupFlow } from "../../hooks/useSetupFlow";

export function EnableScanning({
	enable,
}: {
	enable: SetupFlow["enable"];
}) {
	const getStepContent = () => {
		if (enable.state === "loading") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium">{enable.currentTask}</p>
					<div className="text-muted-foreground text-xs">
						Please wait while we configure your guild...
					</div>
				</div>
			);
		}

		if (enable.state === "success") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-green-600">
						Scanning enabled successfully!
					</p>
					<div className="text-muted-foreground text-xs">
						Your guild and all channels are now configured for clip
						scanning.
					</div>
				</div>
			);
		}

		if (enable.state === "error") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-red-600">
						Failed to enable scanning
					</p>
					{enable.error && (
						<div className="rounded bg-red-50 p-2 text-xs text-red-500">
							{enable.error}
						</div>
					)}
					<Button onClick={enable.retry} disabled={enable.isPending}>
						Retry
					</Button>
				</div>
			);
		}

		// state === null (waiting on previous step)
		return (
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">
					This step will enable message scanning for your guild and
					configure all channels to be scanned for clips.
				</p>
				<div className="text-muted-foreground space-y-1 text-xs">
					<div>• Enable scanning for the guild</div>
					<div>• Enable scanning for all channels</div>
				</div>
			</div>
		);
	};

	return (
		<Step title="Enable Scanning" state={enable.state}>
			{getStepContent()}
		</Step>
	);
}
