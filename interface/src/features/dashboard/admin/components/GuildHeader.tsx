"use client";

import { useToggleScanning, useGuild, useChannels } from "@/lib/hooks";
import type { Guild } from "@/lib/api/types";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardAction,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useScanStats } from "../scans/lib/useScanStats";
import { useScanVisibilityStore } from "../scans/stores/useScanVisibilityStore";

interface GuildHeaderProps {
	guild: Guild;
}

export function GuildHeader({ guild: initialGuild }: GuildHeaderProps) {
	// Use React Query with initial data from Server Component
	// This allows the UI to update reactively when mutations occur
	const { data: guild } = useGuild(initialGuild.id, {
		initialData: initialGuild,
	});
	const toggleMutation = useToggleScanning(initialGuild.id);

	if (!guild) {
		return null;
	}

	const messageScanEnabled = guild.message_scan_enabled;

	const handleToggle = () => {
		toggleMutation.mutate(!messageScanEnabled);
	};

	return (
		<div className="flex flex-col gap-4 md:flex-row">
			<div className="flex flex-1 items-center gap-4">
				{guild.icon_url && (
					<div>
						<img
							src={guild.icon_url}
							alt={`${guild.name} icon`}
							className="h-32 w-32 rounded-xl"
						/>
					</div>
				)}
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold">{guild.name}</h1>
					<p className="text-muted-foreground text-sm">
						Guild ID: {guild.id}
					</p>
					{guild.owner_id === guild.owner_id && (
						<Badge variant="destructive">Owner</Badge>
					)}
				</div>
			</div>

			<GuildScanningCard
				guildId={guild.id}
				messageScanEnabled={messageScanEnabled}
				handleToggle={handleToggle}
				toggleMutation={toggleMutation}
			/>
		</div>
	);
}

function GuildScanningCard({
	guildId,
	messageScanEnabled,
	handleToggle,
	toggleMutation,
}: {
	guildId: string;
	messageScanEnabled: boolean;
	handleToggle: () => void;
	toggleMutation: any;
}) {
	const error = toggleMutation.error as Error | null;

	return (
		<Card className="flex-1 gap-3 py-4">
			<CardHeader className="flex flex-wrap justify-between">
				<CardTitle className="text-lg">Message Scanning</CardTitle>
				<CardAction className="flex items-center gap-3">
					{error && (
						<p className="text-destructive text-sm">
							{error.message}
						</p>
					)}
					<Switch
						checked={messageScanEnabled}
						onCheckedChange={handleToggle}
						disabled={toggleMutation.isPending || !!error}
						title={
							messageScanEnabled
								? "Pause message scanning"
								: "Resume message scanning"
						}
					/>
				</CardAction>
			</CardHeader>
			<CardContent className="space-y-3">
				<ScanStatusLine
					active={messageScanEnabled}
					pending={toggleMutation.isPending}
				/>
				<GuildScanStats guildId={guildId} />
			</CardContent>
		</Card>
	);
}

function formatStatCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function GuildScanStats({ guildId }: { guildId: string }) {
	const { data: channels = [], isLoading: channelsLoading } =
		useChannels(guildId);
	const {
		totalChannels,
		enabledChannelsCount,
		failedScans,
		totalMessagesScanned,
		totalClips,
		isLoading,
		error,
	} = useScanStats(guildId, channels);
	const { setStatusFilter } = useScanVisibilityStore();

	if (channelsLoading || isLoading || error) return null;

	return (
		<div className="text-muted-foreground/60 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t pt-3 text-xs">
			<span>
				<b className="text-muted-foreground font-mono font-semibold">
					{enabledChannelsCount}
				</b>
				/{totalChannels} enabled
			</span>
			<span>·</span>
			<span>
				<b className="text-muted-foreground font-mono font-semibold">
					{formatStatCount(totalClips)}
				</b>{" "}
				clips
			</span>
			<span>·</span>
			<span>
				<b className="text-muted-foreground font-mono font-semibold">
					{formatStatCount(totalMessagesScanned)}
				</b>{" "}
				messages scanned
			</span>
			{failedScans > 0 && (
				<>
					<span>·</span>
					<Link
						href={`/dashboard/${guildId}/channels`}
						className="text-destructive hover:underline"
						onClick={() => setStatusFilter("failed")}
						title="Show only failed channels"
					>
						<b className="font-mono font-semibold">{failedScans}</b>{" "}
						failed →
					</Link>
				</>
			)}
		</div>
	);
}

function ScanStatusLine({
	active,
	pending,
}: {
	active: boolean;
	pending: boolean;
}) {
	if (pending) {
		return (
			<div className="text-muted-foreground flex items-center gap-2.5 text-sm">
				<span className="bg-muted-foreground/50 h-2 w-2 flex-shrink-0 rounded-full" />
				<span>Updating...</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-center gap-2.5 text-sm",
				active ? "text-muted-foreground" : "text-red-400"
			)}
		>
			<span
				className={cn(
					"h-2 w-2 flex-shrink-0 rounded-full",
					active ? "animate-pulse bg-green-400" : "bg-red-400"
				)}
			/>
			{active ? (
				<span>
					<span className="font-medium text-green-400">Active</span> —
					new clips are picked up automatically.
				</span>
			) : (
				<span>
					<span className="font-medium">Paused</span> — new clips are
					not being picked up.
				</span>
			)}
		</div>
	);
}
