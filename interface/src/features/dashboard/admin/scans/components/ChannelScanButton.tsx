"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScanText, InfoIcon, X } from "lucide-react";
import type { ChannelWithStatus } from "../types";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useStartCustomScan, useCancelScan } from "@/lib/hooks/useScans";
import { useState } from "react";
import { StartScanOptions } from "@/lib/api/scan";
import { toast } from "sonner";

export function ChannelScanButton({ channel }: { channel: ChannelWithStatus }) {
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

	const title = !channel.message_scan_enabled
		? "Enable scanning in Overview tab first"
		: "";

	// Show cancel button if scan is running/queued, otherwise show scan dropdown
	if (isScanning) {
		return (
			<button
				type="button"
				className="hover:bg-destructive/10 text-destructive hover:text-destructive/80 border-destructive/20 flex h-9 w-fit cursor-pointer items-center gap-2 rounded-sm border p-1 px-3"
				onClick={handleCancel}
				disabled={cancelScanMutation.isPending}
				title="Stop running scan"
			>
				<X className="h-4 w-4" />
				<span className="text-sm">Stop</span>
			</button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="hover:bg-muted/50 text-muted-foreground hover:text-foreground flex h-9 w-fit cursor-pointer items-center gap-2 rounded-sm border p-1 px-3"
					disabled={isDisabled}
					title={title}
				>
					<ScanText className="h-4 w-4" />
					<span className="text-sm">Scan</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
					Quick Actions
				</DropdownMenuLabel>
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
					Normal Scan
				</MenuItemWithInfo>

				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
					History
				</DropdownMenuLabel>

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
					Backfill Scan
				</MenuItemWithInfo>

				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
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
					Force Reprocess All
				</MenuItemWithInfo>
			</DropdownMenuContent>
		</DropdownMenu>
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
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="flex w-full items-center justify-between">
			<DropdownMenuItem
				onClick={onClick}
				disabled={disabled}
				className={`flex-1 cursor-pointer ${className}`}
			>
				<span>{children}</span>
			</DropdownMenuItem>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<div
						className="hover:bg-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm"
						onMouseEnter={() => setIsOpen(true)}
						onMouseLeave={() => setIsOpen(false)}
					>
						<InfoIcon className="text-muted-foreground h-4 w-4" />
					</div>
				</PopoverTrigger>
				<PopoverContent
					align="center"
					side="right"
					className="z-50 w-64"
				>
					<p className="text-sm">{hoverText}</p>
				</PopoverContent>
			</Popover>
		</div>
	);
}
