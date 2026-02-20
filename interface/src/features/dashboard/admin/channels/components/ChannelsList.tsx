"use client";

import { useMemo } from "react";
import { useBulkUpdateChannels, useChannelStats } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
	groupChannelsByType,
	getSortedChannelTypes,
	ChannelTypeHeader,
} from "@/components/composite/ChannelOrganizer";
import { Channel } from "@/lib/api/channel";
import { useGuild } from "@/lib/hooks";
import { useToggleChannel } from "@/lib/hooks/useChannels";
import { Switch } from "@/components/ui/switch";

type ChannelsListProps = {
	guildId: string;
};

export function ChannelsList({ guildId }: ChannelsListProps) {
	const bulkUpdateMutation = useBulkUpdateChannels(guildId);

	const { data: guild } = useGuild(guildId);
	const guildScanEnabled = guild?.message_scan_enabled;

	// Track live channels state from React Query cache
	const { isLoading, error, data: channelsList } = useChannelStats(guildId);

	// Group channels by type and sort alphabetically by name within each group
	const groupedChannels = useMemo(
		() => groupChannelsByType(channelsList || [], "name"),
		[channelsList]
	);

	// Get sorted channel types based on configured display order
	const sortedChannelTypes = useMemo(() => getSortedChannelTypes(), []);

	if (!channelsList) {
		return null;
	}

	const enabledCount = channelsList.filter(
		(c) => c.message_scan_enabled
	).length;
	const allEnabled = enabledCount === channelsList.length;
	const allDisabled = enabledCount === 0;

	const handleBulkToggle = (enabled: boolean) => {
		bulkUpdateMutation.mutate(enabled);
	};

	return (
		<div className="mt-6">
			{/* Channel Controls */}
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-xl font-semibold">
					Channels ({channelsList.length})
					<span className="text-muted-foreground ml-2 text-sm">
						{enabledCount} enabled
					</span>
				</h2>

				{channelsList.length > 0 && (
					<div className="flex gap-2">
						<Button
							onClick={() => handleBulkToggle(true)}
							disabled={
								bulkUpdateMutation.isPending ||
								allEnabled ||
								!guildScanEnabled
							}
							size="sm"
							variant="ghost"
						>
							{bulkUpdateMutation.isPending
								? "Updating..."
								: "Enable All"}
						</Button>
						<Button
							onClick={() => handleBulkToggle(false)}
							disabled={
								bulkUpdateMutation.isPending || allDisabled
							}
							size="sm"
							variant="ghost"
						>
							{bulkUpdateMutation.isPending
								? "Updating..."
								: "Disable All"}
						</Button>
					</div>
				)}
			</div>

			{bulkUpdateMutation.isError && (
				<div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
					<p className="text-sm text-red-400">
						{bulkUpdateMutation.error instanceof Error
							? bulkUpdateMutation.error.message
							: "Failed to update channels"}
					</p>
				</div>
			)}

			{channelsList.length === 0 ? (
				<p className="text-muted-foreground">
					No channels found for this guild.
				</p>
			) : (
				<div className="space-y-4">
					{sortedChannelTypes.map((type) => {
						const channelsOfType = groupedChannels[type];
						if (channelsOfType.length === 0) return null;

						return (
							<div key={type} className="space-y-2">
								{/* Channel type header */}
								<div className="bg-muted/30 rounded-lg px-3 py-2">
									<ChannelTypeHeader type={type} />
								</div>
								{/* Channels of this type */}
								<div className="space-y-2">
									{channelsOfType.map((channel) => (
										<ChannelItem
											key={channel.id}
											channel={channel}
											guildScanEnabled={
												guildScanEnabled ?? false
											}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function ChannelItem({
	channel,
	guildScanEnabled,
}: {
	channel: Channel;
	guildScanEnabled: boolean;
}) {
	return (
		<div
			key={channel.id}
			className="rounded-lg border border-white/20 p-3 transition-colors hover:bg-white/5"
		>
			<div className="flex items-center justify-between gap-2 sm:gap-4">
				<ChannelToggleScan
					guildId={channel.guild_id}
					channelId={channel.id}
					enabled={channel.message_scan_enabled}
				/>

				<div className="flex-1">
					<div className="flex items-center gap-2">
						<span className="font-medium">#{channel.name}</span>
						<span className="rounded bg-white/10 px-2 py-0.5 text-xs">
							{channel.type}
						</span>
						{channel.nsfw && (
							<span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
								NSFW
							</span>
						)}
					</div>
					<p className="text-muted-foreground mt-1 text-xs">
						ID: {channel.id}
					</p>
				</div>
				<div className="flex flex-col items-end gap-1">
					<span className="px-2 py-0.5 text-xs">
						{channel.clip_count} Clips
					</span>
				</div>
				<div className="flex flex-col items-end gap-1">
					<ChannelScanEnabled
						channel={channel}
						guildScanEnabled={guildScanEnabled}
					/>
				</div>
			</div>
		</div>
	);
}

function ChannelScanEnabled({
	channel,
	guildScanEnabled,
}: {
	channel: Channel;
	guildScanEnabled: boolean;
}) {
	return (
		<span
			className={`rounded px-2 py-1 text-xs ${
				!guildScanEnabled && channel.message_scan_enabled
					? "bg-orange-500/20 text-orange-400"
					: channel.message_scan_enabled
						? "bg-green-500/20 text-green-400"
						: "bg-gray-500/20 text-gray-400"
			}`}
		>
			{!guildScanEnabled && channel.message_scan_enabled
				? "Scan: Ready"
				: channel.message_scan_enabled
					? "Scan: ON"
					: "Scan: OFF"}
		</span>
	);
}

function ChannelToggleScan({
	guildId,
	channelId,
	enabled,
}: {
	guildId: string;
	channelId: string;
	enabled: boolean;
}) {
	const toggleChannel = useToggleChannel(guildId);

	const handleToggle = (enabled: boolean) => {
		toggleChannel.mutate({ channelId, enabled });
	};

	return (
		<Switch
			checked={enabled}
			onCheckedChange={handleToggle}
			disabled={toggleChannel.isPending}
			className="border-white/20 shadow-sm data-[state=checked]:bg-green-500/60 data-[state=unchecked]:bg-gray-500/40"
		/>
	);
}
