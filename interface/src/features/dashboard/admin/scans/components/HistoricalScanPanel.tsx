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
    startingUnscanned: boolean;
    startingUpdate: boolean;
    startingHistorical: boolean;
    onHistoricalScan: (scanType: "backfill" | "integrity" | "force") => void;
}

export function HistoricalScanPanel({
    enabledChannelsCount,
    startingUnscanned,
    startingUpdate,
    startingHistorical,
    onHistoricalScan,
}: HistoricalScanPanelProps) {
    const isAnyOperationRunning =
        startingUnscanned || startingUpdate || startingHistorical;

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
                        disabled={
                            isAnyOperationRunning || enabledChannelsCount === 0
                        }
                        className="w-full mb-1"
                        size="lg"
                        variant="outline"
                    >
                        {startingHistorical
                            ? "Starting..."
                            : "Backfill History"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                        Scans backward from the oldest known message to fill in
                        missing history. Stops when it hits already-scanned
                        messages (or end of channel).
                    </p>
                </div>

                {/* Deep Integrity Scan */}
                <div>
                    <Button
                        onClick={() => onHistoricalScan("integrity")}
                        disabled={
                            isAnyOperationRunning || enabledChannelsCount === 0
                        }
                        className="w-full mb-1"
                        size="lg"
                        variant="outline"
                    >
                        {startingHistorical
                            ? "Starting..."
                            : "Deep Integrity Scan (Skip Existing)"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                        Scans backward from Now to Beginning. Checks every
                        message but skips processing if we already have it.
                        Useful for finding gaps.
                    </p>
                </div>

                {/* Force Reprocess */}
                <div>
                    <Button
                        onClick={() => onHistoricalScan("force")}
                        disabled={
                            isAnyOperationRunning || enabledChannelsCount === 0
                        }
                        className="w-full mb-1"
                        size="lg"
                        variant="destructive"
                    >
                        {startingHistorical
                            ? "Starting..."
                            : "⚠️ Force Reprocess (Update All)"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                        Scans backward from Now to Beginning. Reprocesses{" "}
                        <strong>EVERYTHING</strong>. Very expensive. Use only if
                        you changed parsing rules.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
