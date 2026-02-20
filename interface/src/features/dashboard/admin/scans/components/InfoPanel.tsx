import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

interface InfoPanelProps {
	unscannedOrFailedCount: number;
	activeScans: number;
	successfulScans: number;
}

export function InfoPanel({
	unscannedOrFailedCount,
	activeScans,
	successfulScans,
}: InfoPanelProps) {
	return (
		<Card className="border-blue-500/50 bg-blue-500/10">
			<CardContent className="">
				<div className="flex items-start gap-3">
					<Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
					<div className="flex-1">
						<h3 className="mb-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
							About Scans
						</h3>
						<p className="text-sm">
							Scans process Discord messages to find and save
							video clips. Each scan examines messages in a
							channel and extracts clips based on your settings.
							You can scan individual channels or all channels at
							once.
						</p>
						<div className="text-muted-foreground mt-2 flex gap-4 text-xs">
							<span>
								• <strong>{unscannedOrFailedCount}</strong>{" "}
								unscanned/failed channels
							</span>
							<span>
								• <strong>{activeScans}</strong> active scans
							</span>
							<span>
								• <strong>{successfulScans}</strong> scanned
								channels
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
