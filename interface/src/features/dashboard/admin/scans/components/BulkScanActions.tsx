import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw } from "lucide-react";

interface BulkScanActionsProps {
	unscannedOrFailedCount: number;
	enabledChannelsCount: number;
	isPending: boolean;
	onScanUnscannedOrFailed: () => void;
	onUpdateAllChannels: () => void;
}

export function BulkScanActions({
	unscannedOrFailedCount,
	enabledChannelsCount,
	isPending,
	onScanUnscannedOrFailed,
	onUpdateAllChannels,
}: BulkScanActionsProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bulk Scan Actions</CardTitle>
				<CardDescription>
					Start scans for multiple channels at once
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Scan Unscanned/Failed Button */}
				<Button
					onClick={onScanUnscannedOrFailed}
					disabled={isPending || unscannedOrFailedCount === 0}
					className="w-full"
					size="lg"
					variant="default"
				>
					<Play className="h-4 w-4" />
					{isPending
						? "Starting..."
						: `Scan Unscanned or Failed Channels (${unscannedOrFailedCount})`}
				</Button>
				<p className="text-muted-foreground text-xs">
					Scans channels that have never been scanned or previously
					failed. Uses channel default scan direction (forward from
					oldest or backward from newest).
				</p>

				{/* Update All Channels Button */}
				<Button
					onClick={onUpdateAllChannels}
					disabled={isPending || enabledChannelsCount === 0}
					className="w-full"
					size="lg"
					variant="secondary"
				>
					<RefreshCw className="h-4 w-4" />
					{isPending
						? "Starting..."
						: `Scan and Update All Channels (${enabledChannelsCount})`}
				</Button>
				<p className="text-muted-foreground text-xs">
					Forward scan from the last known position to catch new
					messages. Continues until reaching the newest message or
					current end.
				</p>
			</CardContent>
		</Card>
	);
}
