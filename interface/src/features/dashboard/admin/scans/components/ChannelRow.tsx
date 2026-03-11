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
			<div className="flex flex-col flex-wrap items-start gap-3 px-3 py-2 md:flex-row">
				<div className="flex flex-1 gap-2 xl:self-center">
					<EnabledBadge enabled={isEnabled} />

					<div className="flex flex-1 flex-col gap-1 xl:flex-row xl:gap-2">
						<div className="text-md h-full truncate overflow-visible font-semibold xl:w-56">
							{channel.name}
						</div>
						<ChannelStats
							channel={channel}
							clips={clips}
							scanned={scanned}
							hitrate={hitRate ?? 0}
						/>
					</div>
				</div>

				<div className="flex h-full w-full gap-3 md:flex-0 md:self-center">
					<ChannelLinks channel={channel} />
					<div className="flex-1" />
					<ChannelScanStatus
						channel={channel}
						status={status}
						isEnabled={isEnabled}
					/>

					<ChannelScanButton channel={channel} />
				</div>
			</div>
		</div>
	);
}

function ChannelScanStatus({
	channel,
	status,
	isEnabled,
}: {
	channel: ChannelWithStatus;
	status?: string;
	isEnabled: boolean;
}) {
	return (
		<>
			{channel.scanStatus?.error_message && (
				<TooltipProvider>
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<div className="text-destructive flex cursor-help items-center gap-1 text-xs">
								<AlertCircle className="h-4 w-4 shrink-0" />
								<span className="hidden truncate lg:inline">
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

			<StatusBadge status={status} grayscale={!isEnabled} />
		</>
	);
}

function StatItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-1 items-center gap-1 whitespace-nowrap md:flex-0">
			<span className="font-bold">{value}</span>
			<span className="text-muted-foreground/60">{label}</span>
		</div>
	);
}

function ChannelStats({
	channel,
	clips,
	scanned,
	hitrate,
}: {
	channel: ChannelWithStatus;
	clips: number;
	scanned: number;
	hitrate: number;
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
				value={formatRelativeTime(
					channel.scanStatus?.updated_at ?? "never"
				)}
			/>

			<div className="flex-1" />
		</div>
	);
}

function ChannelLinks({ channel }: { channel: ChannelWithStatus }) {
	const backwardId = channel.scanStatus?.backward_message_id;
	const forwardId = channel.scanStatus?.forward_message_id;

	const links: { id: string; label: string }[] = [
		backwardId && {
			id: backwardId,
			label: "Start",
		},
		forwardId && {
			id: forwardId,
			label: "End",
		},
	].filter((link) => link !== null) as { id: string; label: string }[];

	return (
		<>
			{links.map(({ id, label }) => (
				<a
					key={id + label}
					href={makeDiscordMessageLink(
						channel.guild_id,
						channel.id,
						id
					)}
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-foreground text-muted-foreground flex items-center gap-1 text-xs transition-colors"
				>
					<Link className="mt-0.5 h-2.5 w-2.5" />
					{label}
				</a>
			))}
		</>
	);
}

// <div className="flex min-w-0 flex-1 items-baseline gap-2">
// 	<span className="text-muted-foreground text-sm leading-none">
// 		#
// 	</span>
// 	<span className="truncate text-sm leading-none font-semibold">
// 		{channel.name}
// 	</span>
// 	<span className="text-muted-foreground/60 shrink-0 text-xs leading-none">
// 		{channel.type}
// 	</span>
// 	<span className="text-muted-foreground/40 hidden shrink-0 font-mono text-xs leading-none lg:inline">
// 		{channel.id}
// 	</span>
// </div>;
