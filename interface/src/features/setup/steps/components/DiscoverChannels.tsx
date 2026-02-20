"use client";

import type { Guild } from "@/lib/api/guild";
import { Step } from "./Step";
import { useChannels } from "@/lib/hooks";
import { useEffect } from "react";
import { useSetupStoreHydrated } from "../../stores/useSetupStore";
import { Button } from "@/components/ui/button";

export function DiscoverChannels({
	guild,
	onComplete,
	shouldStart = false,
}: {
	guild: Guild;
	onComplete: () => void;
	shouldStart?: boolean;
}) {
	const {
		data: channelsData,
		isLoading,
		error,
		refetch,
	} = useChannels(guild.id);

	const { startStep, updateStepState, completeStep, getStepData } =
		useSetupStoreHydrated();

	const stepData = getStepData("discover_channels");

	// Start the step when shouldStart becomes true
	useEffect(() => {
		if (shouldStart && stepData.state === null) {
			startStep("discover_channels");
		}
	}, [shouldStart, stepData.state]);

	// Auto-complete when channels data is available or when step starts with existing data
	useEffect(() => {
		if (stepData.state === "loading" && !isLoading) {
			if (error) {
				updateStepState(
					"discover_channels",
					"error",
					"Failed to fetch channels from Discord"
				);
			} else if (channelsData) {
				// Small delay to show the loading state briefly
				setTimeout(() => {
					handleChannelsResult();
				}, 500);
			}
		}
	}, [channelsData, isLoading, error, stepData.state]);

	const handleChannelsResult = () => {
		if (!channelsData) return;

		const channelCount = channelsData.length;
		console.log(
			"DiscoverChannels completing with",
			channelCount,
			"channels"
		);

		if (channelCount > 0) {
			completeStep("discover_channels");
			console.log(
				"DiscoverChannels step completed, calling onComplete in 1s"
			);
			setTimeout(() => {
				onComplete();
			}, 1000);
		} else {
			updateStepState(
				"discover_channels",
				"need_action",
				"No channels found in this server"
			);
		}
	};

	const handleRefresh = () => {
		refetch();
		startStep("discover_channels");
	};

	const getStepContent = () => {
		// Debug logging removed to prevent infinite loops

		if (stepData.state === null) {
			const channelCount = channelsData?.length || 0;
			return (
				<div className="space-y-2">
					<p className="text-muted-foreground text-sm">
						We need to discover all channels in your Discord server
						to set up scanning.
					</p>
					{channelCount > 0 ? (
						<div className="text-sm">
							Found{" "}
							<span className="font-semibold">
								{channelCount}
							</span>{" "}
							channels in your server.
						</div>
					) : (
						<div className="text-muted-foreground space-y-1 text-xs">
							<div>• Connect to Discord API</div>
							<div>• Fetch all server channels</div>
							<div>• Verify bot permissions</div>
						</div>
					)}
					{shouldStart && (
						<div className="mt-2 text-xs text-blue-600">
							Ready to discover channels...
						</div>
					)}
				</div>
			);
		}

		if (stepData.state === "loading" || isLoading) {
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

		if (stepData.state === "success") {
			const channelCount = channelsData?.length || 0;
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-green-600">
						Channels discovered successfully!
					</p>
					<div className="text-sm">
						Found{" "}
						<span className="font-semibold">{channelCount}</span>{" "}
						channels in your server.
					</div>
					<div className="text-muted-foreground text-xs">
						Your bot has access to view the server structure.
					</div>
				</div>
			);
		}

		if (stepData.state === "need_action") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-yellow-600">
						No Channels Discovered
					</p>
					<div className="text-muted-foreground text-xs">
						We couldn&apos;t find any channels in your server. This
						might be a temporary issue.
					</div>
					<Button onClick={handleRefresh} disabled={isLoading}>
						Refresh
					</Button>
				</div>
			);
		}

		if (stepData.state === "error") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-red-600">
						Failed to discover channels
					</p>
					{stepData.error && (
						<div className="rounded bg-red-50 p-2 text-xs text-red-500">
							{stepData.error}
						</div>
					)}
					<Button onClick={handleRefresh} disabled={isLoading}>
						Retry
					</Button>
				</div>
			);
		}

		return null;
	};

	return (
		<Step title="Discover Channels" state={stepData.state}>
			{getStepContent()}
		</Step>
	);
}
