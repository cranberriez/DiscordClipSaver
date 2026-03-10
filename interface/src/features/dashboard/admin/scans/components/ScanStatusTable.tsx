"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	RefreshCw,
	AlertCircle,
	EyeOff,
	Eye,
	Search,
	Link,
	Layers,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ChannelWithStatus } from "../types";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import {
	getSortedChannelTypes,
	ChannelTypeHeader,
} from "@/components/composite/ChannelOrganizer";
import { ChannelScanButton } from "./ChannelScanButton";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useScanVisibilityStore,
	type ScanStatusFilter,
	type ScanSortBy,
} from "../stores/useScanVisibilityStore";
import {
	formatCount,
	getHitRate,
	getHitRateColor,
	makeDiscordMessageLink,
	sortChannels,
} from "../lib/scanStatusTableHelpers";
import { useScanTableState } from "../lib/useScanTableState";

interface ScanStatusTableProps {
	channels: ChannelWithStatus[];
	onRefresh: () => void;
}

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex items-center gap-1">
			<span className="text-muted-foreground/60 uppercase">{label}</span>
			<span className="font-medium">{value}</span>
		</span>
	);
}

function IndeterminateCheckbox({
	checked,
	indeterminate,
	onChange,
}: {
	checked: boolean;
	indeterminate: boolean;
	onChange: () => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	React.useEffect(() => {
		if (ref.current) ref.current.indeterminate = indeterminate;
	}, [indeterminate]);
	return (
		<input
			ref={ref}
			type="checkbox"
			checked={checked}
			onChange={onChange}
			className="accent-primary h-4 w-4 cursor-pointer"
		/>
	);
}

/**
 * Clickable enabled/disabled badge.
 * - Resting: shows current state with solid styling.
 * - Hover: dashed border, no background, text color of the *opposite* state.
 */
function EnabledToggleBadge({
	enabled,
	onToggle,
}: {
	enabled: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			onClick={onToggle}
			className={[
				"shrink-0 cursor-pointer rounded border px-2 py-0.5 text-xs font-medium transition-all select-none",
				enabled
					? // Currently enabled — hover shows "would disable" style
						"hover:border-muted-foreground/50 hover:text-muted-foreground border-green-600/40 bg-green-600/20 text-green-500 hover:border-dashed hover:bg-transparent"
					: // Currently disabled — hover shows "would enable" style
						"border-border text-muted-foreground hover:border-dashed hover:border-green-600/50 hover:bg-transparent hover:text-green-500",
			].join(" ")}
		>
			{enabled ? "Enabled" : "Disabled"}
		</button>
	);
}

interface ChannelRowProps {
	channel: ChannelWithStatus;
	simpleView: boolean;
	checked: boolean;
	onCheck: (id: string, e: React.MouseEvent) => void;
	onToggleEnabled: (channelId: string, enabled: boolean) => void;
}

function ChannelRow({
	channel,
	simpleView,
	checked,
	onCheck,
	onToggleEnabled,
}: ChannelRowProps) {
	const status = channel.scanStatus?.status;
	const clips = channel.scanStatus?.message_count ?? 0;
	const scanned = channel.scanStatus?.total_messages_scanned ?? 0;
	const hitRate = getHitRate(channel);
	const isActive = status === "RUNNING" || status === "QUEUED";
	const isEnabled = channel.message_scan_enabled;

	const forwardId = channel.scanStatus?.forward_message_id;
	const backwardId = channel.scanStatus?.backward_message_id;

	return (
		<div
			className={`overflow-hidden rounded-md border ${checked ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"}`}
		>
			{/* Main row */}
			<div className="flex items-center gap-3 px-3 py-2.5">
				{/* Checkbox */}
				<input
					type="checkbox"
					checked={checked}
					onClick={(e) => onCheck(channel.id, e)}
					onChange={() => {}}
					className="accent-primary h-4 w-4 shrink-0 cursor-pointer"
				/>

				{/* Enabled/Disabled toggle badge */}
				<EnabledToggleBadge
					enabled={isEnabled}
					onToggle={() => onToggleEnabled(channel.id, !isEnabled)}
				/>

				{/* Hash + name + type + id — all baseline-aligned */}
				<div className="flex min-w-0 flex-1 items-baseline gap-2">
					<span className="text-muted-foreground text-sm leading-none">
						#
					</span>
					<span className="truncate text-sm leading-none font-semibold">
						{channel.name}
					</span>
					<span className="text-muted-foreground/60 shrink-0 text-xs leading-none">
						{channel.type}
					</span>
					<span className="text-muted-foreground/40 hidden shrink-0 font-mono text-xs leading-none lg:inline">
						{channel.id}
					</span>
				</div>

				{/* Error — left of status badge */}
				{channel.scanStatus?.error_message && (
					<TooltipProvider>
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<div className="text-destructive flex cursor-help items-center gap-1 text-xs">
									<AlertCircle className="h-3.5 w-3.5 shrink-0" />
									<span className="hidden max-w-[150px] truncate lg:inline xl:max-w-[250px]">
										{channel.scanStatus.error_message}
									</span>
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-[300px] text-wrap">
								<p>{channel.scanStatus.error_message}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

				{/* Status badge — colored when active, grayscale when idle */}
				<StatusBadge status={status ?? null} grayscale={!isEnabled} />

				{/* Scan button */}
				<ChannelScanButton channel={channel} />
			</div>

			{/* Stats row — hidden in simple view */}
			{!simpleView && (
				<div className="bg-muted/20 text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-xs">
					<StatItem label="CLIPS" value={formatCount(clips)} />
					<StatItem
						label="SCANNED"
						value={scanned > 0 ? formatCount(scanned) : "—"}
					/>
					{hitRate !== null && (
						<span className="flex items-center gap-1">
							<span className="text-muted-foreground/60 uppercase">
								HIT RATE
							</span>
							<span
								className={`font-medium ${getHitRateColor(hitRate)}`}
							>
								●
							</span>
							<span className="font-medium">
								{hitRate.toFixed(1)}%
							</span>
						</span>
					)}
					{channel.scanStatus?.updated_at && (
						<StatItem
							label="LAST SCAN"
							value={formatRelativeTime(
								channel.scanStatus.updated_at
							)}
						/>
					)}

					{/* Spacer */}
					<div className="flex-1" />

					{/* Oldest / Newest msg links */}
					{backwardId && (
						<a
							href={makeDiscordMessageLink(
								channel.guild_id,
								channel.id,
								backwardId
							)}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground flex items-center gap-1 transition-colors"
						>
							<Link className="h-3 w-3" />
							Oldest msg
						</a>
					)}
					{forwardId && (
						<a
							href={makeDiscordMessageLink(
								channel.guild_id,
								channel.id,
								forwardId
							)}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground flex items-center gap-1 transition-colors"
						>
							<Link className="h-3 w-3" />
							Newest msg
						</a>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScanStatusTable({ channels, onRefresh }: ScanStatusTableProps) {
	const {
		simpleView,
		searchQuery,
		statusFilter,
		sortBy,
		showDisabledChannels,
		toggleShowDisabledChannels,
		toggleSimpleView,
		setSearchQuery,
		setStatusFilter,
		setSortBy,
	} = useScanVisibilityStore();

	const {
		processedChannels,
		groupedChannels,
		selectedIds,
		allSelected,
		someSelected,
		bulkPending,
		handleGlobalCheckbox,
		handleRowCheck,
		handleChannelToggle,
		handleBulkToggle,
	} = useScanTableState(channels, onRefresh);

	const sortedChannelTypes = getSortedChannelTypes();

	const filterButtons: { label: string; value: ScanStatusFilter }[] = [
		{ label: "All", value: "all" },
		{ label: "OK", value: "ok" },
		{ label: "Failed", value: "failed" },
	];

	return (
		<div className="space-y-3">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				{/* Global checkbox + bulk actions */}
				<div className="flex items-center gap-2">
					<IndeterminateCheckbox
						checked={allSelected}
						indeterminate={someSelected}
						onChange={handleGlobalCheckbox}
					/>
					{selectedIds.size > 0 && (
						<>
							<span className="text-muted-foreground text-xs">
								{selectedIds.size} selected
							</span>
							<Button
								size="sm"
								variant="outline"
								className="h-8 border-green-600/40 bg-green-600/10 text-xs text-green-500 hover:bg-green-600/20"
								disabled={bulkPending}
								onClick={() => handleBulkToggle(true)}
							>
								Enable
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="h-8 text-xs"
								disabled={bulkPending}
								onClick={() => handleBulkToggle(false)}
							>
								Disable
							</Button>
						</>
					)}
				</div>

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
				<div className="bg-card flex items-center rounded-md border">
					{filterButtons.map((btn, i) => (
						<button
							key={btn.value}
							onClick={() => setStatusFilter(btn.value)}
							className={[
								"h-8 px-3 text-xs font-medium transition-colors",
								i === 0 ? "rounded-l-md" : "",
								i === filterButtons.length - 1
									? "rounded-r-md"
									: "",
								i !== filterButtons.length - 1
									? "border-r"
									: "",
								statusFilter === btn.value
									? "bg-muted text-foreground"
									: "text-muted-foreground hover:text-foreground",
							]
								.filter(Boolean)
								.join(" ")}
						>
							{btn.value === "ok" && (
								<span className="mr-1 text-green-500">✓</span>
							)}
							{btn.value === "failed" && (
								<span className="text-destructive mr-1">△</span>
							)}
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

				{/* Right controls */}
				<div className="ml-auto flex items-center gap-1">
					<Button
						onClick={toggleShowDisabledChannels}
						variant="ghost"
						size="sm"
						className="text-muted-foreground hover:text-foreground h-8 text-xs"
					>
						{showDisabledChannels ? (
							<>
								<EyeOff className="mr-1 h-3.5 w-3.5" />
								Hide Disabled
							</>
						) : (
							<>
								<Eye className="mr-1 h-3.5 w-3.5" />
								Show Disabled
							</>
						)}
					</Button>
					<Button
						onClick={onRefresh}
						variant="ghost"
						size="sm"
						className="text-muted-foreground hover:text-foreground h-8 text-xs"
					>
						<RefreshCw className="mr-1 h-3.5 w-3.5" />
						Refresh
					</Button>
					<Button
						onClick={toggleSimpleView}
						variant={simpleView ? "secondary" : "ghost"}
						size="sm"
						className="h-8 text-xs"
					>
						<Layers className="mr-1 h-3.5 w-3.5" />
						Simple View
					</Button>
				</div>
			</div>

			{/* Channel list */}
			<div className="space-y-0">
				{sortedChannelTypes.map((type) => {
					const channelsOfType = groupedChannels[type];
					if (!channelsOfType || channelsOfType.length === 0)
						return null;

					const sorted = sortChannels(channelsOfType, sortBy);
					const typeTotal = channelsOfType.length;
					const typeActive = channelsOfType.filter(
						(ch) =>
							ch.scanStatus?.status === "RUNNING" ||
							ch.scanStatus?.status === "QUEUED"
					).length;

					return (
						<React.Fragment key={type}>
							{/* Group header */}
							<div className="flex items-center gap-2 py-2 pl-1">
								<ChannelTypeHeader type={type} />
								<span className="text-muted-foreground/50 text-xs">
									{typeTotal}
								</span>
								{typeActive > 0 && (
									<Badge className="border-blue-500/30 bg-blue-500/20 text-xs text-blue-400">
										{typeActive} active
									</Badge>
								)}
							</div>

							{/* Channel rows */}
							<div className="space-y-1.5">
								{sorted.map((channel) => (
									<ChannelRow
										key={channel.id}
										channel={channel}
										simpleView={simpleView}
										checked={selectedIds.has(channel.id)}
										onCheck={handleRowCheck}
										onToggleEnabled={handleChannelToggle}
									/>
								))}
							</div>
						</React.Fragment>
					);
				})}

				{processedChannels.length === 0 && channels.length > 0 && (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No channels match the current filters.
					</div>
				)}
				{channels.length === 0 && (
					<div className="text-muted-foreground py-8 text-center text-sm">
						No channels found
					</div>
				)}
			</div>
		</div>
	);
}
