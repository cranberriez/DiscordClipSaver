import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InfoPanelProps {
	totalChannels: number;
	enabledChannelsCount: number;
	failedScans: number;
	activeScans: number;
	successfulScans: number;
	totalMessagesScanned: number;
	totalClips: number;
}

function formatCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

interface StatRowProps {
	label: string;
	value: string | number;
	valueClassName?: string;
}

function StatRow({ label, value, valueClassName }: StatRowProps) {
	return (
		<div className="flex items-center justify-between gap-2 py-1.5">
			<span className="text-muted-foreground text-sm whitespace-nowrap">
				{label}
			</span>
			<span
				className={`text-sm font-semibold tabular-nums ${valueClassName ?? ""}`}
			>
				{value}
			</span>
		</div>
	);
}

export function InfoPanel({
	totalChannels,
	enabledChannelsCount,
	failedScans,
	activeScans,
	successfulScans,
	totalMessagesScanned,
	totalClips,
}: InfoPanelProps) {
	return (
		<Card className="h-full flex-1">
			<CardHeader className="pb-2">
				<CardTitle className="text-muted-foreground flex-1 text-xs font-semibold tracking-widest uppercase">
					Overview
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="divide-border/50 divide-y">
					<StatRow label="Total Channels" value={totalChannels} />
					<StatRow
						label="Enabled"
						value={enabledChannelsCount}
						valueClassName="text-green-400"
					/>
					<StatRow
						label="Failed"
						value={failedScans}
						valueClassName={failedScans > 0 ? "text-red-400" : ""}
					/>
					<StatRow
						label="Active"
						value={activeScans}
						valueClassName={
							activeScans > 0 ? "text-yellow-400" : ""
						}
					/>
					<StatRow
						label="Scanned"
						value={successfulScans}
						valueClassName="text-blue-400"
					/>
					<StatRow
						label="Total Clips"
						value={formatCount(totalClips)}
						valueClassName="text-muted-foreground"
					/>
					<StatRow
						label="Msgs Scanned"
						value={formatCount(totalMessagesScanned)}
						valueClassName="text-muted-foreground"
					/>
				</div>
			</CardContent>
		</Card>
	);
}
