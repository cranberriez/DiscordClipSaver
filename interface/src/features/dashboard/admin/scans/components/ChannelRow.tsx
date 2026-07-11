"use client";

import { useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ChannelScanButton, ChannelHistoryActions } from "./ChannelScanButton";
import type { ChannelWithStatus } from "../types";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import {
	formatCount,
	makeDiscordMessageLink,
	snowflakeToDate,
} from "../lib/scanStatusTableHelpers";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ChannelRowProps {
	channel: ChannelWithStatus;
	guildId: string;
	onToggle: (channelId: string, enabled: boolean) => void;
}

export function ChannelRow({ channel, onToggle }: ChannelRowProps) {
	const [expanded, setExpanded] = useState(false);

	const status = channel.scanStatus?.status;
	const clips = channel.scanStatus?.message_count ?? 0;
	const scanned = channel.scanStatus?.total_messages_scanned ?? 0;
	const isEnabled = channel.message_scan_enabled;

	return (
		<div className="border-border/50 bg-card rounded-md border">
			{/* Main row */}
			<div
				className="flex cursor-pointer flex-col flex-wrap items-start gap-3 px-3 py-2 select-none hover:bg-white/[0.02] md:flex-row"
				onClick={() => setExpanded((v) => !v)}
			>
				<div className="flex flex-1 items-center gap-3 xl:self-center">
					<span onClick={(e) => e.stopPropagation()}>
						<Switch
							checked={isEnabled}
							onCheckedChange={(enabled) =>
								onToggle(channel.id, enabled)
							}
							title={
								isEnabled
									? "Disable scanning for this channel"
									: "Enable scanning for this channel"
							}
						/>
					</span>

					<div
						className={cn(
							"flex flex-1 flex-col gap-1 xl:flex-row xl:gap-2",
							!isEnabled && "opacity-45"
						)}
					>
						<div className="text-md h-full truncate overflow-visible font-semibold xl:w-56">
							<span className="text-muted-foreground mr-1.5 font-normal">
								#
							</span>
							{channel.name}
						</div>
						<ChannelStats
							channel={channel}
							clips={clips}
							scanned={scanned}
						/>
					</div>
				</div>

				<div className="flex h-full w-full items-center gap-3 md:w-auto md:flex-0 md:self-center">
					<ChannelError channel={channel} />
					<div className="flex-1" />
					<StatusBadge status={status} grayscale={!isEnabled} />
					<span onClick={(e) => e.stopPropagation()}>
						<ChannelScanButton channel={channel} />
					</span>
					<button
						type="button"
						className="text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm"
						title={expanded ? "Collapse" : "Expand"}
						onClick={(e) => {
							e.stopPropagation();
							setExpanded((v) => !v);
						}}
					>
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform duration-200",
								expanded && "rotate-180"
							)}
						/>
					</button>
				</div>
			</div>

			{/* Drawer */}
			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-200 ease-out",
					expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				)}
			>
				<div className="min-h-0 overflow-hidden">
					<div className="border-border/50 bg-background/40 rounded-b-md border-t px-4 py-4 md:pl-14">
						{/* Actions row */}
						<div className="border-border/50 border-b pb-3.5">
							<ChannelHistoryActions channel={channel} />
						</div>

						{/* Details */}
						<div className="mt-4 grid gap-6 md:grid-cols-2">
							<ChannelSettings />
							<ScannedRange channel={channel} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ChannelError({ channel }: { channel: ChannelWithStatus }) {
	if (!channel.scanStatus?.error_message) return null;

	return (
		<TooltipProvider>
			<Tooltip delayDuration={300}>
				<TooltipTrigger asChild>
					<div className="text-destructive flex cursor-help items-center gap-1 text-xs">
						<AlertCircle className="h-4 w-4 shrink-0" />
						<span className="hidden max-w-72 truncate lg:inline">
							{channel.scanStatus.error_message}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent className="max-w-[300px] text-wrap">
					<p>{channel.scanStatus.error_message}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function StatItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-1 items-center gap-2 whitespace-nowrap md:flex-0">
			<span
				className={cn(
					"min-w-10 text-right font-mono font-bold",
					value === "—" && "text-muted-foreground/25"
				)}
			>
				{value}
			</span>
			<span className="text-muted-foreground/60">{label}</span>
		</div>
	);
}

function ChannelStats({
	channel,
	clips,
	scanned,
}: {
	channel: ChannelWithStatus;
	clips: number;
	scanned: number;
}) {
	return (
		<div className="text-muted-foreground flex min-h-6 flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-xs">
			<StatItem
				label="clips"
				value={clips > 0 ? formatCount(clips) : "—"}
			/>
			<StatItem
				label="messages"
				value={scanned > 0 ? formatCount(scanned) : "—"}
			/>
			<StatItem
				label="last scan"
				value={
					channel.scanStatus
						? formatRelativeTime(channel.scanStatus.updated_at)
						: "—"
				}
			/>

			<div className="flex-1" />
		</div>
	);
}

/**
 * Jump links to the newest and oldest scanned messages in Discord.
 * forward_message_id = newest, backward_message_id = oldest.
 */
function ScannedRange({ channel }: { channel: ChannelWithStatus }) {
	const newestId = channel.scanStatus?.forward_message_id;
	const oldestId = channel.scanStatus?.backward_message_id;

	return (
		<div>
			<h4 className="text-muted-foreground/60 mb-2.5 text-xs font-semibold tracking-widest uppercase">
				Scanned Range
			</h4>
			{!newestId && !oldestId ? (
				<p className="text-muted-foreground/60 text-xs">
					Nothing scanned yet.
				</p>
			) : (
				<div className="flex flex-col gap-1.5">
					{newestId && (
						<RangeLink
							channel={channel}
							messageId={newestId}
							label="Newest scanned message"
							icon={<ArrowDown className="h-3 w-3" />}
						/>
					)}
					{oldestId && (
						<RangeLink
							channel={channel}
							messageId={oldestId}
							label="Oldest scanned message"
							icon={<ArrowUp className="h-3 w-3" />}
						/>
					)}
					<p className="text-muted-foreground/60 mt-1 text-xs">
						Opens the message in Discord.
					</p>
				</div>
			)}
		</div>
	);
}

function RangeLink({
	channel,
	messageId,
	label,
	icon,
}: {
	channel: ChannelWithStatus;
	messageId: string;
	label: string;
	icon: React.ReactNode;
}) {
	return (
		<a
			href={makeDiscordMessageLink(
				channel.guild_id,
				channel.id,
				messageId
			)}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex items-center gap-2 text-sm"
		>
			<span className="text-muted-foreground/60">{icon}</span>
			<span className="group-hover:underline">{label}</span>
			<span className="text-muted-foreground/60 text-xs">
				{formatRelativeTime(snowflakeToDate(messageId))}
			</span>
		</a>
	);
}

/** Per-channel settings — no backend support yet, rendered disabled. */
function ChannelSettings() {
	return (
		<div onClick={(e) => e.stopPropagation()}>
			<h4 className="text-muted-foreground/60 mb-2.5 text-xs font-semibold tracking-widest uppercase">
				Channel Settings <i className="text-yellow-500 text-xs">(coming soon)</i>
			</h4>
			<div className="grid max-w-xs grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2">
				<span className="text-muted-foreground text-xs">
					Max clips / day
				</span>
				<Input
					type="number"
					value={0}
					disabled
					readOnly
					className="h-7 w-32 text-xs"
				/>
				<span className="text-muted-foreground text-xs">
					Clip visibility
				</span>
				<Select disabled value="default">
					<SelectTrigger className="h-7 w-32 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="default">Server default</SelectItem>
					</SelectContent>
				</Select>
			</div>
			
		</div>
	);
}
