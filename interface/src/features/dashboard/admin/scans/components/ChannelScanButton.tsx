"use client";

import { ButtonGroup } from "@/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, InfoIcon } from "lucide-react";
import type { ChannelWithStatus } from "../types";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardTrigger,
	HoverCardContent,
} from "@/components/ui/hover-card";
import { useStartCustomScan } from "@/lib/hooks/useScans";
import { StartScanOptions } from "@/lib/api/scan";
import { toast } from "sonner";
import { useGuildSettings } from "@/lib/hooks/useSettings";
import type { DefaultChannelSettings } from "@/lib/schema/guild-settings.schema";

export function ChannelScanButton({ channel }: { channel: ChannelWithStatus }) {
	const { isPending, start } = useStartCustomScan(channel.guild_id);
	const { data: guildSettings } = useGuildSettings(channel.guild_id);

	// Get limit from settings or default to 1000, capped at 10000
	// Cast default_channel_settings to the correct type
	const defaultSettings =
		guildSettings?.default_channel_settings as unknown as DefaultChannelSettings | null;
	const limit = Math.min(
		defaultSettings?.max_messages_per_pass ?? 1000,
		10000
	);

	const handleStart = (options?: StartScanOptions) => {
		// Use default limit if not provided in options
		const finalOptions = {
			limit,
			...options,
		};

		start(channel.id, finalOptions, {
			onSuccess: () => {
				toast("Scan started successfully");
			},
			onError: (err) => {
				toast("Failed to start scan: " + err);
			},
		});
	};

	const isDisabled =
		!channel.message_scan_enabled ||
		isPending ||
		channel.scanStatus?.status === "RUNNING" ||
		channel.scanStatus?.status === "QUEUED";

	const title = !channel.message_scan_enabled
		? "Enable scanning in Overview tab first"
		: "";

	const buttonText = !channel.message_scan_enabled
		? "Disabled"
		: channel.scanStatus?.status === "RUNNING"
			? "Running..."
			: channel.scanStatus?.status === "QUEUED"
				? "Queued..."
				: "Scan";

	return (
		<ButtonGroup className="ml-auto">
			<Button
				onClick={() =>
					handleStart({
						isUpdate: true,
						rescan: "stop",
					})
				}
				disabled={isDisabled}
				variant="outline"
				size="sm"
				title={title}
			>
				{buttonText}
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" disabled={isDisabled}>
						<EllipsisVertical />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
					<MenuItemWithInfo
						onClick={() =>
							handleStart({
								isUpdate: true,
								rescan: "stop",
							})
						}
						disabled={isDisabled}
						hoverText="Scans from the last scanned message forward to Now. Use this to catch up on recent activity."
					>
						Forward Update
					</MenuItemWithInfo>

					<DropdownMenuSeparator />
					<DropdownMenuLabel>History</DropdownMenuLabel>

					<MenuItemWithInfo
						onClick={() =>
							handleStart({
								isBackfill: true,
								rescan: "stop",
							})
						}
						disabled={isDisabled}
						hoverText="Scans from the oldest scanned message backward to fill in gaps in history."
					>
						Backfill History
					</MenuItemWithInfo>

					<DropdownMenuSeparator />
					<DropdownMenuLabel className="text-destructive">
						Maintenance (Expensive)
					</DropdownMenuLabel>

					<MenuItemWithInfo
						onClick={() =>
							handleStart({
								isHistorical: true,
								rescan: "continue",
							})
						}
						disabled={isDisabled}
						hoverText="Deep scan from Now backward to Beginning, skipping known messages. Verifies integrity of history."
					>
						Deep Integrity Scan
					</MenuItemWithInfo>

					<MenuItemWithInfo
						onClick={() => {
							if (
								confirm(
									"⚠️ This will reprocess ALL messages in this channel from scratch.\n\nThis is very expensive and should only be used if you need to regenerate metadata or apply new parsing rules.\n\nContinue?"
								)
							) {
								handleStart({
									isHistorical: true,
									rescan: "update",
								});
							}
						}}
						disabled={isDisabled}
						hoverText="Force re-scan of ALL messages from Now backward. Regenerates everything. Very slow."
						className="text-destructive focus:text-destructive"
					>
						Force Reprocess
					</MenuItemWithInfo>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	);
}

function MenuItemWithInfo({
	onClick,
	disabled,
	children,
	hoverText,
	className,
}: {
	onClick: () => void;
	disabled: boolean;
	children: React.ReactNode;
	hoverText: string;
	className?: string;
}) {
	return (
		<DropdownMenuItem
			onClick={onClick}
			disabled={disabled}
			className={`flex cursor-pointer items-center justify-between ${className}`}
		>
			<span>{children}</span>
			<HoverCard openDelay={200} closeDelay={100}>
				<HoverCardTrigger asChild>
					<div className="inline-flex">
						<InfoIcon className="text-muted-foreground ml-2 h-4 w-4" />
					</div>
				</HoverCardTrigger>
				<HoverCardContent align="center" side="right" className="z-50">
					<p className="text-sm">{hoverText}</p>
				</HoverCardContent>
			</HoverCard>
		</DropdownMenuItem>
	);
}
