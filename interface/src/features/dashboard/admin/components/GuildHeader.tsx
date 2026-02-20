"use client";

import { useToggleScanning, useGuild } from "@/lib/hooks";
import type { Guild } from "@/lib/api/types";
import {
	Card,
	CardContent,
	CardAction,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle2, XCircle } from "lucide-react";

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

			{toggleMutation.isError && (
				<Card className="border-destructive/50 bg-destructive/10">
					<CardContent className="pt-6">
						<p className="text-destructive text-sm">
							{toggleMutation.error instanceof Error
								? toggleMutation.error.message
								: "Failed to toggle scanning"}
						</p>
					</CardContent>
				</Card>
			)}

			<GuildScanningCard
				messageScanEnabled={messageScanEnabled}
				handleToggle={handleToggle}
				toggleMutation={toggleMutation}
			/>
		</div>
	);
}

function GuildScanningCard({
	messageScanEnabled,
	handleToggle,
	toggleMutation,
}: {
	messageScanEnabled: boolean;
	handleToggle: () => void;
	toggleMutation: any;
}) {
	return (
		<Card className="flex-1 gap-3 py-4 md:h-32">
			<CardHeader>
				<CardTitle className="text-lg">Message Scanning</CardTitle>
				<CardAction>
					<ToggleGuildScanning
						messageScanEnabled={messageScanEnabled}
						handleToggle={handleToggle}
						toggleMutation={toggleMutation}
					/>
				</CardAction>
			</CardHeader>
			<CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
				<Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
				<span>
					This controls whether scans are allowed to run. Use the
					Scans tab to configure and start scanning specific channels.
				</span>
			</CardContent>
		</Card>
	);
}

function ToggleGuildScanning({
	messageScanEnabled,
	handleToggle,
	toggleMutation,
}: {
	messageScanEnabled: boolean;
	handleToggle: () => void;
	toggleMutation: any;
}) {
	return (
		<Button
			onClick={handleToggle}
			disabled={toggleMutation.isPending}
			variant="ghost"
			className={`relative min-w-[140px] cursor-pointer px-4 transition-all ${
				messageScanEnabled
					? "border border-green-400/40 bg-green-950/30 text-green-400 shadow-[0_0_12px_rgba(74,222,128,0.15)] hover:bg-green-950/30! hover:shadow-[0_0_16px_rgba(74,222,128,0.25)]"
					: "border border-red-400/40 bg-red-950/30 text-red-400 shadow-[0_0_12px_rgba(248,113,113,0.15)] hover:bg-red-950/30! hover:shadow-[0_0_16px_rgba(248,113,113,0.25)]"
			}`}
		>
			<div className="absolute top-1/2 left-3 -translate-y-1/2">
				{messageScanEnabled ? (
					<CheckCircle2 className="h-4 w-4" />
				) : (
					<XCircle className="h-4 w-4" />
				)}
			</div>
			<span
				className={`flex items-center font-semibold tracking-wider uppercase ${
					toggleMutation.isPending ? "text-xs" : ""
				}`}
			>
				{toggleMutation.isPending
					? "Updating..."
					: messageScanEnabled
						? "Active"
						: "Inactive"}
			</span>
		</Button>
	);
}
