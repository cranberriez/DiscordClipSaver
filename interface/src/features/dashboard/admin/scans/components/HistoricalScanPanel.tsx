import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HistoricalScanPanelProps {
	enabledChannelsCount: number;
	isPending: boolean;
	onHistoricalScan: (scanType: "backfill" | "integrity" | "force") => void;
}

export function HistoricalScanPanel({
	enabledChannelsCount,
	isPending,
	onHistoricalScan,
}: HistoricalScanPanelProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>History & Maintenance</CardTitle>
				<CardDescription>
					Manage history and verify data integrity
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Backfill History */}
				<div>
					<Button
						onClick={() => onHistoricalScan("backfill")}
						disabled={isPending || enabledChannelsCount === 0}
						className="mb-1 w-full"
						size="lg"
						variant="outline"
					>
						{isPending ? "Starting..." : "Backfill History"}
					</Button>
					<p className="text-muted-foreground text-center text-xs">
						Scans backward from the oldest known message to fill in
						missing history. Stops when it hits already-scanned
						messages (or end of channel).
					</p>
				</div>

				{/* Deep Integrity Scan */}
				<div>
					<Button
						onClick={() => onHistoricalScan("integrity")}
						disabled={isPending || enabledChannelsCount === 0}
						className="mb-1 w-full"
						size="lg"
						variant="outline"
					>
						{isPending
							? "Starting..."
							: "Deep Integrity Scan (Skip Existing)"}
					</Button>
					<p className="text-muted-foreground text-center text-xs">
						Scans backward from Now to Beginning. Checks every
						message but skips processing if we already have it.
						Useful for finding gaps.
					</p>
				</div>

				{/* Force Reprocess */}
				<div>
					<Button
						onClick={() => onHistoricalScan("force")}
						disabled={isPending || enabledChannelsCount === 0}
						className="mb-1 w-full"
						size="lg"
						variant="destructive"
					>
						{isPending
							? "Starting..."
							: "⚠️ Force Reprocess (Update All)"}
					</Button>
					<p className="text-muted-foreground text-center text-xs">
						Scans backward from Now to Beginning. Reprocesses{" "}
						<strong>EVERYTHING</strong>. Very expensive. Use only if
						you changed parsing rules.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
