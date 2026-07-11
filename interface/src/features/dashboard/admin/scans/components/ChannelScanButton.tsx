"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, History, Play, X } from "lucide-react";
import type { ChannelWithStatus } from "../types";
import { useStartCustomScan, useCancelScan } from "@/lib/hooks/useScans";
import { StartScanOptions } from "@/lib/api/scan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function useChannelScan(channel: ChannelWithStatus) {
	const { isPending, start } = useStartCustomScan(channel.guild_id);
	const cancelScanMutation = useCancelScan(channel.guild_id);

	const handleStart = (options?: StartScanOptions) => {
		start(channel.id, options, {
			onSuccess: () => {
				toast("Scan started successfully");
			},
			onError: (err) => {
				toast("Failed to start scan: " + err);
			},
		});
	};

	const handleCancel = () => {
		cancelScanMutation.mutate(
			{ channelId: channel.id },
			{
				onSuccess: () => {
					toast("Scan cancelled successfully");
				},
				onError: (err) => {
					toast("Failed to cancel scan: " + err);
				},
			}
		);
	};

	const isDisabled = !channel.message_scan_enabled || isPending;

	const isScanning =
		channel.scanStatus?.status === "RUNNING" ||
		channel.scanStatus?.status === "QUEUED";

	return {
		handleStart,
		handleCancel,
		isDisabled,
		isScanning,
		cancelPending: cancelScanMutation.isPending,
	};
}

/**
 * Top-level row button. Runs a forward "catch up" scan directly
 * (labelled Retry for failed channels), or stops a running scan.
 */
export function ChannelScanButton({ channel }: { channel: ChannelWithStatus }) {
	const { handleStart, handleCancel, isDisabled, isScanning, cancelPending } =
		useChannelScan(channel);

	const title = !channel.message_scan_enabled
		? "Enable scanning for this channel first"
		: "Scans forward from the last scanned message to catch up on recent activity";

	if (isScanning) {
		return (
			<button
				type="button"
				className="hover:bg-destructive/10 text-destructive hover:text-destructive/80 border-destructive/20 flex h-9 w-26 cursor-pointer items-center justify-center gap-2 rounded-sm border"
				onClick={handleCancel}
				disabled={cancelPending}
				title="Stop running scan"
			>
				<X className="h-4 w-4" />
				<span className="text-sm">Stop</span>
			</button>
		);
	}

	const isFailed = channel.scanStatus?.status === "FAILED";

	return (
		<button
			type="button"
			className="hover:bg-muted/50 text-muted-foreground hover:text-foreground flex h-9 w-26 cursor-pointer items-center justify-center gap-2 rounded-sm border disabled:cursor-not-allowed disabled:opacity-40"
			disabled={isDisabled}
			title={title}
			onClick={() =>
				handleStart(
					isFailed
						? { isUpdate: false, rescan: "stop" }
						: { isUpdate: true, rescan: "stop" }
				)
			}
		>
			<Play className="h-3.5 w-3.5" />
			<span className="text-sm">{isFailed ? "Retry" : "Catch Up"}</span>
		</button>
	);
}

/**
 * Drawer actions: Import Full History button + Advanced dropdown
 * (Deep Integrity Scan, Force Reprocess) for a single channel.
 */
export function ChannelHistoryActions({
	channel,
}: {
	channel: ChannelWithStatus;
}) {
	const { handleStart, isDisabled } = useChannelScan(channel);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<button
				type="button"
				className="hover:bg-muted/50 text-foreground flex h-8 cursor-pointer items-center gap-2 rounded-sm border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
				disabled={isDisabled}
				title="Scans from the oldest scanned message backward to fill in older history"
				onClick={() =>
					handleStart({
						isBackfill: true,
						rescan: "stop",
					})
				}
			>
				<History className="h-3.5 w-3.5" />
				Import Full History
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
						disabled={isDisabled}
					>
						Advanced
						<ChevronDown className="h-3.5 w-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-72">
					<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
						Maintenance — this channel only
					</DropdownMenuLabel>
					<TwoLineItem
						title="Deep Integrity Scan"
						description="Re-checks every message for gaps. Skips clips already processed."
						disabled={isDisabled}
						onClick={() =>
							handleStart({
								isHistorical: true,
								rescan: "continue",
							})
						}
					/>
					<DropdownMenuSeparator />
					<TwoLineItem
						title="Force Reprocess"
						description="Wipes this channel's scan state and redoes everything. Very slow."
						disabled={isDisabled}
						destructive
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
					/>
				</DropdownMenuContent>
			</DropdownMenu>

			<span className="text-muted-foreground/60 ml-1 text-xs">
				Import pulls in messages older than the scanned range.
			</span>
		</div>
	);
}

export function TwoLineItem({
	title,
	description,
	onClick,
	disabled,
	destructive,
}: {
	title: string;
	description: string;
	onClick: () => void;
	disabled?: boolean;
	destructive?: boolean;
}) {
	return (
		<DropdownMenuItem
			onClick={onClick}
			disabled={disabled}
			className="cursor-pointer"
		>
			<div className="flex flex-col gap-0.5">
				<span
					className={cn(
						"text-sm font-medium",
						destructive && "text-destructive"
					)}
				>
					{title}
				</span>
				<span className="text-muted-foreground text-xs leading-snug">
					{description}
				</span>
			</div>
		</DropdownMenuItem>
	);
}
