"use client";

import { Step } from "./Step";
import { Button } from "@/components/ui/button";
import type { SetupFlow } from "../../hooks/useSetupFlow";

export function DiscoverChannels({
	discover,
}: {
	discover: SetupFlow["discover"];
}) {
	const getStepContent = () => {
		if (discover.state === "loading") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium">
						Discovering channels...
					</p>
					<div className="text-muted-foreground text-xs">
						Connecting to Discord and fetching channel
						information...
					</div>
				</div>
			);
		}

		if (discover.state === "success") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-green-600">
						Channels discovered successfully!
					</p>
					<div className="text-sm">
						Found{" "}
						<span className="font-semibold">
							{discover.channelCount}
						</span>{" "}
						channels in your server.
					</div>
					<div className="text-muted-foreground text-xs">
						Your bot has access to view the server structure.
					</div>
				</div>
			);
		}

		if (discover.state === "need_action") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-yellow-600">
						No Channels Discovered
					</p>
					<div className="text-muted-foreground text-xs">
						We couldn&apos;t find any channels in your server. This
						might be a temporary issue.
					</div>
					<Button onClick={discover.retry} disabled={discover.isFetching}>
						Refresh
					</Button>
				</div>
			);
		}

		if (discover.state === "error") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-red-600">
						Failed to discover channels
					</p>
					{discover.error && (
						<div className="rounded bg-red-50 p-2 text-xs text-red-500">
							{discover.error}
						</div>
					)}
					<Button onClick={discover.retry} disabled={discover.isFetching}>
						Retry
					</Button>
				</div>
			);
		}

		// state === null (not started yet)
		return (
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">
					We need to discover all channels in your Discord server to
					set up scanning.
				</p>
				<div className="text-muted-foreground space-y-1 text-xs">
					<div>• Connect to Discord API</div>
					<div>• Fetch all server channels</div>
					<div>• Verify bot permissions</div>
				</div>
			</div>
		);
	};

	return (
		<Step title="Discover Channels" state={discover.state}>
			{getStepContent()}
		</Step>
	);
}
