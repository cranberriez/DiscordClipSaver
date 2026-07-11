"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Search, Play, ChevronDown } from "lucide-react";
import {
	useScanVisibilityStore,
	type ScanStatusFilter,
	type ScanSortBy,
} from "../stores/useScanVisibilityStore";
import { TwoLineItem } from "./ChannelScanButton";

const STATUS_FILTERS: { label: string; value: ScanStatusFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "OK", value: "ok" },
	{ label: "Failed", value: "failed" },
];

interface ScanToolbarProps {
	onRefresh: () => void;
	unscannedCount: number;
	failedCount: number;
	enabledChannelsCount: number;
	isPending: boolean;
	bulkTogglePending: boolean;
	onScanUnscanned: () => void;
	onCatchUpAll: () => void;
	onRescanFailed: () => void;
	onHistoricalScan: (scanType: "backfill" | "integrity" | "force") => void;
	onBulkToggle: (enabled: boolean) => void;
}

export function ScanToolbar({
	onRefresh,
	unscannedCount,
	failedCount,
	enabledChannelsCount,
	isPending,
	bulkTogglePending,
	onScanUnscanned,
	onCatchUpAll,
	onRescanFailed,
	onHistoricalScan,
	onBulkToggle,
}: ScanToolbarProps) {
	const {
		searchQuery,
		statusFilter,
		sortBy,
		showDisabledChannels,
		toggleShowDisabledChannels,
		setSearchQuery,
		setStatusFilter,
		setSortBy,
	} = useScanVisibilityStore();

	const scanActionsDisabled = isPending || enabledChannelsCount === 0;
	const hasUnscanned = unscannedCount > 0;

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
			{/* Search */}
			<div className="relative min-w-40 flex-1 sm:max-w-52">
				<Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
				<Input
					placeholder="Search channels..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="h-8 pl-8 text-sm"
				/>
			</div>

			{/* Status filter */}
			<div className="bg-input/30 border-input flex items-center rounded-md border p-0.5">
				{STATUS_FILTERS.map((btn) => (
					<button
						key={btn.value}
						onClick={() => setStatusFilter(btn.value)}
						className={[
							"h-7.5 rounded-md px-3 text-xs font-medium transition-colors",
							statusFilter === btn.value
								? "bg-muted text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{btn.label}
					</button>
				))}
			</div>

			{/* Sort */}
			<div className="flex items-center gap-1.5">
				<span className="text-muted-foreground text-xs">Sort:</span>
				<Select
					value={sortBy}
					onValueChange={(v) => setSortBy(v as ScanSortBy)}
				>
					<SelectTrigger className="h-8 w-28 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">name</SelectItem>
						<SelectItem value="clips">clips</SelectItem>
						<SelectItem value="scanned">scanned</SelectItem>
						<SelectItem value="last_scan">last scan</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Hide disabled */}
			<Label className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
				<Switch
					checked={!showDisabledChannels}
					onCheckedChange={toggleShowDisabledChannels}
					className="scale-90"
				/>
				Hide disabled
			</Label>

			{/* Refresh */}
			<Button
				onClick={onRefresh}
				variant="ghost"
				size="sm"
				className="text-muted-foreground hover:text-foreground h-8 text-xs"
			>
				<RefreshCw className="mr-1 h-3.5 w-3.5" />
				Refresh
			</Button>

			{/* Scan actions */}
			<div className="ml-auto flex items-center gap-2">
				<Button
					onClick={hasUnscanned ? onScanUnscanned : onCatchUpAll}
					disabled={scanActionsDisabled}
					size="sm"
					className="h-8"
					title={
						hasUnscanned
							? "Run a first scan on channels that have never been scanned"
							: "Forward scan every enabled channel from its last position"
					}
				>
					<Play className="mr-1 h-3.5 w-3.5" />
					{hasUnscanned
						? `Scan Unscanned (${unscannedCount})`
						: "Catch Up All"}
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground h-8 text-xs"
						>
							Advanced
							<ChevronDown className="ml-1 h-3.5 w-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-76">
						{hasUnscanned && (
							<>
								<TwoLineItem
									title="Catch Up All"
									description="Forward scan every enabled channel from its last position."
									disabled={scanActionsDisabled}
									onClick={onCatchUpAll}
								/>
								<DropdownMenuSeparator />
							</>
						)}
						<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
							History
						</DropdownMenuLabel>
						<TwoLineItem
							title="Import Full History"
							description="Backward scan — pulls in messages older than each channel's scanned range."
							disabled={scanActionsDisabled}
							onClick={() => onHistoricalScan("backfill")}
						/>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
							Maintenance — rarely needed
						</DropdownMenuLabel>
						<TwoLineItem
							title={`Rescan Failed (${failedCount})`}
							description="Re-run the scan on channels whose last scan failed."
							disabled={scanActionsDisabled || failedCount === 0}
							onClick={onRescanFailed}
						/>
						<TwoLineItem
							title="Deep Integrity Scan"
							description="Re-checks every message for gaps. Skips clips already processed."
							disabled={scanActionsDisabled}
							onClick={() => onHistoricalScan("integrity")}
						/>
						<TwoLineItem
							title="Force Reprocess All"
							description="Wipes scan state and redoes everything. Slow and expensive."
							disabled={scanActionsDisabled}
							destructive
							onClick={() => onHistoricalScan("force")}
						/>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
							Channels
						</DropdownMenuLabel>
						<TwoLineItem
							title="Enable All"
							description="Turn on scanning for every channel."
							disabled={bulkTogglePending}
							onClick={() => onBulkToggle(true)}
						/>
						<TwoLineItem
							title="Disable All"
							description="Turn off scanning for every channel."
							disabled={bulkTogglePending}
							onClick={() => onBulkToggle(false)}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
