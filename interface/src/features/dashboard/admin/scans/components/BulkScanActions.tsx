import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Play,
	RefreshCw,
	History,
	ShieldCheck,
	AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkScanActionsProps {
	unscannedOrFailedCount: number;
	enabledChannelsCount: number;
	isPending: boolean;
	onScanUnscannedOrFailed: () => void;
	onUpdateAllChannels: () => void;
	onHistoricalScan: (scanType: "backfill" | "integrity" | "force") => void;
}

interface ActionCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	onClick: () => void;
	disabled?: boolean;
	colorClassName: string;
}

function ActionCard({
	icon,
	title,
	description,
	onClick,
	disabled,
	colorClassName,
}: ActionCardProps) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
				"disabled:cursor-not-allowed disabled:opacity-40",
				colorClassName
			)}
		>
			<span className="mt-0.5 shrink-0">{icon}</span>
			<div className="min-w-0">
				<p className="text-sm leading-tight font-semibold">{title}</p>
				<p className="text-muted-foreground mt-0.5 text-xs leading-snug">
					{description}
				</p>
			</div>
		</button>
	);
}

export function BulkScanActions({
	unscannedOrFailedCount,
	enabledChannelsCount,
	isPending,
	onScanUnscannedOrFailed,
	onUpdateAllChannels,
	onHistoricalScan,
}: BulkScanActionsProps) {
	return (
		<Card className="flex-1">
			<CardHeader className="pb-3">
				<CardTitle className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
					Bulk Scan Actions
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{/* Top row: 2 primary actions */}
				<div className="grid gap-2 lg:grid-cols-2">
					<ActionCard
						icon={<Play className="h-4 w-4 text-cyan-400" />}
						title={`Scan Unscanned / Failed (${unscannedOrFailedCount})`}
						description="Never scanned or previously failed"
						onClick={onScanUnscannedOrFailed}
						disabled={isPending || unscannedOrFailedCount === 0}
						colorClassName="border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10"
					/>
					<ActionCard
						icon={<RefreshCw className="h-4 w-4 text-green-400" />}
						title="Scan & Update All"
						description="Forward scan from last position"
						onClick={onUpdateAllChannels}
						disabled={isPending || enabledChannelsCount === 0}
						colorClassName="border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
					/>
				</div>

				{/* Second row: 2 maintenance actions */}
				<div className="grid gap-2 lg:grid-cols-2">
					<ActionCard
						icon={<History className="h-4 w-4 text-indigo-400" />}
						title="Backfill History"
						description="Backward from oldest message"
						onClick={() => onHistoricalScan("backfill")}
						disabled={isPending || enabledChannelsCount === 0}
						colorClassName="border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10"
					/>
					<ActionCard
						icon={
							<ShieldCheck className="h-4 w-4 text-purple-400" />
						}
						title="Deep Integrity Scan"
						description="Check every message, skip processed"
						onClick={() => onHistoricalScan("integrity")}
						disabled={isPending || enabledChannelsCount === 0}
						colorClassName="border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
					/>
				</div>

				{/* Force reprocess — full width, destructive */}
				<ActionCard
					icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
					title="Force Reprocess All"
					description="Reprocess EVERYTHING — expensive"
					onClick={() => onHistoricalScan("force")}
					disabled={isPending || enabledChannelsCount === 0}
					colorClassName="border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
				/>
			</CardContent>
		</Card>
	);
}
