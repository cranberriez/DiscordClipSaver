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
    onHistoricalScan: (rescanMode: "stop" | "continue" | "update") => void;
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
                <CardTitle>Historical Scan</CardTitle>
                <CardDescription>
                    Backward scan from the beginning to establish or correct
                    scan boundaries
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Normal Historical Scan */}
                <Button
                    onClick={() => onHistoricalScan("stop")}
                    disabled={
                        isAnyOperationRunning || enabledChannelsCount === 0
                    }
                    className="w-full"
                    size="lg"
                    variant="outline"
                >
                    {startingHistorical
                        ? "Starting..."
                        : "Normal Scan (Stop on Duplicates)"}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Scans backward from channel start, stops when encountering
                    already-scanned messages. Most efficient.
                </p>

                {/* Skip Existing Historical Scan */}
                <Button
                    onClick={() => onHistoricalScan("continue")}
                    disabled={
                        isAnyOperationRunning || enabledChannelsCount === 0
                    }
                    className="w-full"
                    size="lg"
                    variant="outline"
                >
                    {startingHistorical
                        ? "Starting..."
                        : "Skip Existing (Continue Past Duplicates)"}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Scans backward from channel start, skips already-scanned
                    messages but continues scanning. Use to establish correct
                    boundaries without reprocessing.
                </p>

                {/* Force Update Historical Scan */}
                <Button
                    onClick={() => onHistoricalScan("update")}
                    disabled={
                        isAnyOperationRunning || enabledChannelsCount === 0
                    }
                    className="w-full"
                    size="lg"
                    variant="destructive"
                >
                    {startingHistorical
                        ? "Starting..."
                        : "⚠️ Force Update (Reprocess All)"}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Scans backward from channel start, reprocesses ALL messages
                    including existing ones.
                    <strong className="text-destructive">
                        {" "}
                        Expensive operation!
                    </strong>{" "}
                    Use only after settings changes. Thumbnails are never
                    regenerated if they already exist.
                </p>
            </CardContent>
        </Card>
    );
}
