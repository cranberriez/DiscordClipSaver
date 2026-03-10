import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	RefreshCw,
	AlertCircle,
	EyeOff,
	Eye,
	Search,
	ArrowUp,
	ArrowDown,
	Layers,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ChannelWithStatus } from "../types";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import {
	groupChannelsByType,
	getSortedChannelTypes,
	ChannelTypeHeader,
} from "@/components/composite/ChannelOrganizer";
import { ChannelScanButton } from "./ChannelScanButton";
import {
	useScanVisibilityStore,
	type ScanStatusFilter,
	type ScanSortBy,
} from "../stores/useScanVisibilityStore";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface ScanStatusTableProps {
	channels: ChannelWithStatus[];
	onRefresh: () => void;
}

function formatCount(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

function getHitRate(channel: ChannelWithStatus): number | null {
	const scanned = channel.scanStatus?.total_messages_scanned;
	const clips = channel.scanStatus?.message_count;
	if (!scanned || scanned === 0 || clips === undefined) return null;
	return (clips / scanned) * 100;
}

function getHitRateColor(rate: number): string {
	if (rate >= 5) return "text-green-500";
	if (rate >= 1) return "text-yellow-500";
	return "text-muted-foreground";
}

function getProgressColor(status: string | undefined): string {
	if (status === "RUNNING") return "bg-cyan-400";
	if (status === "QUEUED") return "bg-yellow-500";
	if (status === "FAILED") return "bg-destructive";
	return "bg-primary/40";
}

function makeDiscordMessageLink(
	guildId: string,
	channelId: string,
	messageId: string
): string {
	return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function channelMatchesFilter(
	channel: ChannelWithStatus,
	filter: ScanStatusFilter
): boolean {
	if (filter === "all") return true;
	const status = channel.scanStatus?.status;
	if (filter === "ok")
		return (
			status === "SUCCEEDED" ||
			status === "RUNNING" ||
			status === "QUEUED"
		);
	if (filter === "failed")
		return status === "FAILED" || status === "CANCELLED";
	return true;
}

function sortChannels(
	channels: ChannelWithStatus[],
	sortBy: ScanSortBy
): ChannelWithStatus[] {
	return [...channels].sort((a, b) => {
		if (sortBy === "name") return a.name.localeCompare(b.name);
		if (sortBy === "clips") {
			return (
				(b.scanStatus?.message_count ?? 0) -
				(a.scanStatus?.message_count ?? 0)
			);
		}
		if (sortBy === "scanned") {
			return (
				(b.scanStatus?.total_messages_scanned ?? 0) -
				(a.scanStatus?.total_messages_scanned ?? 0)
			);
		}
		if (sortBy === "last_scan") {
			const aTime = a.scanStatus?.updated_at
				? new Date(a.scanStatus.updated_at).getTime()
				: 0;
			const bTime = b.scanStatus?.updated_at
				? new Date(b.scanStatus.updated_at).getTime()
				: 0;
			return bTime - aTime;
		}
		return 0;
	});
}

interface ChannelRowProps {
	channel: ChannelWithStatus;
	simpleView: boolean;
}

function ChannelRow({ channel, simpleView }: ChannelRowProps) {
	const status = channel.scanStatus?.status;
	const clips = channel.scanStatus?.message_count ?? 0;
	const scanned = channel.scanStatus?.total_messages_scanned ?? 0;
	const hitRate = getHitRate(channel);
	const isActive = status === "RUNNING" || status === "QUEUED";

	const forwardId = channel.scanStatus?.forward_message_id;
	const backwardId = channel.scanStatus?.backward_message_id;

	return (
		<div className="border-b last:border-b-0">
			{/* Main row */}
			<div className="flex items-center gap-3 px-4 py-3">
				{/* Enabled badge */}
				<Badge
					variant={
						channel.message_scan_enabled ? "default" : "outline"
					}
					className={
						channel.message_scan_enabled
							? "shrink-0 border-green-600/40 bg-green-600/20 px-2 text-xs text-green-500"
							: "text-muted-foreground shrink-0 px-2 text-xs"
					}
				>
					{channel.message_scan_enabled ? "Enabled" : "Disabled"}
				</Badge>

				{/* Hash + name + type + id */}
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<span className="text-muted-foreground">#</span>
					<span className="truncate font-semibold">
						{channel.name}
					</span>
					<span className="text-muted-foreground/60 shrink-0 text-xs">
						{channel.type}
					</span>
					<span className="text-muted-foreground/40 hidden shrink-0 font-mono text-xs lg:inline">
						{channel.id}
					</span>
				</div>

				{/* Progress bar — only shown in full view or when active */}
				{(!simpleView || isActive) && (
					<div className="hidden w-40 items-center gap-2 sm:flex">
						<div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
							<div
								className={`h-full rounded-full transition-all ${getProgressColor(status)}`}
								style={{
									width: `${isActive ? (status === "RUNNING" ? 80 : 30) : scanned > 0 ? 100 : 0}%`,
								}}
							/>
						</div>
						{isActive && (
							<span className="text-muted-foreground w-8 text-right text-xs">
								{status === "RUNNING" ? "80%" : "0%"}
							</span>
						)}
					</div>
				)}

				{/* Status badge or OK pill */}
				<div className="shrink-0">
					{isActive ? (
						<StatusBadge status={status ?? ""} />
					) : (
						<StatusPill status={status ?? null} />
					)}
				</div>

				{/* Error */}
				{channel.scanStatus?.error_message && (
					<div className="text-destructive hidden items-center gap-1 text-xs lg:flex">
						<AlertCircle className="h-3.5 w-3.5 shrink-0" />
						<span className="max-w-32 truncate">
							{channel.scanStatus.error_message}
						</span>
					</div>
				)}

				{/* Scan button */}
				<ChannelScanButton channel={channel} />
			</div>

			{/* Stats row — hidden in simple view */}
			{!simpleView && (
				<div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 px-4 pb-3 text-xs">
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
					<StatItem label="AVG TIME" value="—" />

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
							<ArrowUp className="h-3 w-3" />
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
							<ArrowDown className="h-3 w-3" />
							Newest msg
						</a>
					)}
				</div>
			)}
		</div>
	);
}

function StatItem({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex items-center gap-1">
			<span className="text-muted-foreground/60 uppercase">{label}</span>
			<span className="font-medium">{value}</span>
		</span>
	);
}

function StatusPill({ status }: { status: string | null }) {
	if (!status || status === "SUCCEEDED") {
		return (
			<span className="rounded border border-green-600/30 bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-500">
				OK
			</span>
		);
	}
	if (status === "FAILED" || status === "CANCELLED") {
		return (
			<span className="text-destructive border-destructive/30 bg-destructive/10 rounded border px-2 py-0.5 text-xs font-medium">
				{status}
			</span>
		);
	}
	return <StatusBadge status={status} />;
}

export function ScanStatusTable({ channels, onRefresh }: ScanStatusTableProps) {
	const {
		showDisabledChannels,
		simpleView,
		searchQuery,
		statusFilter,
		sortBy,
		toggleShowDisabledChannels,
		toggleSimpleView,
		setSearchQuery,
		setStatusFilter,
		setSortBy,
	} = useScanVisibilityStore();

	const processedChannels = useMemo(() => {
		let result = channels;

		if (!showDisabledChannels) {
			result = result.filter((ch) => ch.message_scan_enabled);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(ch) => ch.name.toLowerCase().includes(q) || ch.id.includes(q)
			);
		}

		result = result.filter((ch) => channelMatchesFilter(ch, statusFilter));

		return result;
	}, [channels, showDisabledChannels, searchQuery, statusFilter]);

	const groupedChannels = useMemo(
		() => groupChannelsByType(processedChannels, "name"),
		[processedChannels]
	);

	const sortedChannelTypes = useMemo(() => getSortedChannelTypes(), []);

	const filterButtons: { label: string; value: ScanStatusFilter }[] = [
		{ label: "All", value: "all" },
		{ label: "OK", value: "ok" },
		{ label: "Failed", value: "failed" },
	];

	return (
		<Card className="overflow-hidden">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
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

				{/* Status filter buttons */}
				<div className="flex items-center rounded-md border">
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

				{/* Right side controls */}
				<div className="ml-auto flex items-center gap-2">
					<Button
						onClick={toggleShowDisabledChannels}
						variant="ghost"
						size="sm"
						className="h-8 text-xs"
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
						className="h-8 text-xs"
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
			<div>
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
							<div className="bg-muted/30 flex items-center gap-2 border-b px-4 py-2">
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
							{sorted.map((channel) => (
								<ChannelRow
									key={channel.id}
									channel={channel}
									simpleView={simpleView}
								/>
							))}
						</React.Fragment>
					);
				})}

				{processedChannels.length === 0 && channels.length > 0 && (
					<div className="text-muted-foreground p-8 text-center text-sm">
						No channels match the current filters.
					</div>
				)}
				{channels.length === 0 && (
					<div className="text-muted-foreground p-8 text-center text-sm">
						No channels found
					</div>
				)}
			</div>
		</Card>
	);
}
