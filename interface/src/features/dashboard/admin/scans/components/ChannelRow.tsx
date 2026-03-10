import { AlertCircle, Link } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { EnabledBadge } from "./EnabledBadge";
import { ChannelScanButton } from "./ChannelScanButton";
import type { ChannelWithStatus } from "../types";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import {
	formatCount,
	getHitRate,
	getHitRateColor,
	makeDiscordMessageLink,
} from "../lib/scanStatusTableHelpers";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

function StatItem({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex items-center gap-1">
			<span className="text-muted-foreground/60 uppercase">{label}</span>
			<span className="font-medium">{value}</span>
		</span>
	);
}

export interface ChannelRowProps {
	channel: ChannelWithStatus;
	simpleView: boolean;
	checked: boolean;
	guildId: string;
}

export function ChannelRow({ channel, simpleView, checked }: ChannelRowProps) {
	const status = channel.scanStatus?.status;
	const clips = channel.scanStatus?.message_count ?? 0;
	const scanned = channel.scanStatus?.total_messages_scanned ?? 0;
	const hitRate = getHitRate(channel);
	const isEnabled = channel.message_scan_enabled;

	const forwardId = channel.scanStatus?.forward_message_id;
	const backwardId = channel.scanStatus?.backward_message_id;

	return (
		<div
			className={`overflow-hidden rounded-md border ${checked ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"}`}
		>
			{/* Main row */}
			<div className="flex items-center gap-3 px-3 py-2.5">
				<EnabledBadge enabled={isEnabled} />

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

				<StatusBadge status={status ?? null} grayscale={!isEnabled} />
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

					<div className="flex-1" />

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
