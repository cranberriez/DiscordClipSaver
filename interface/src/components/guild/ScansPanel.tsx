"use client";

import { useScanStatuses, useStartScan } from "@/lib/hooks/queries";
import { startMultipleChannelScans } from "@/lib/actions/scan";
import { useState, useMemo } from "react";
import type { Channel } from "@/lib/db/types";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Info, RefreshCw, Play, ArrowDown, ArrowUp, AlertCircle } from "lucide-react";

interface ScansPanelProps {
    guildId: string;
    channels: Channel[];
}

export function ScansPanel({
    guildId,
    channels: serverChannels,
}: ScansPanelProps) {
    const {
        data: scanStatuses = [],
        isLoading: loading,
        error,
        refetch,
    } = useScanStatuses(guildId);
    const startScanMutation = useStartScan(guildId);
    const [selectedChannel, setSelectedChannel] = useState<string>("all");
    const [direction, setDirection] = useState<"backward" | "forward">(
        "backward"
    );
    const [starting, setStarting] = useState(false);

    // Convert array to map for easier lookup
    const scanStatusMap = useMemo(() => {
        const map: Record<string, (typeof scanStatuses)[0]> = {};
        scanStatuses.forEach(status => {
            map[status.channel_id] = status;
        });
        return map;
    }, [scanStatuses]);

    // Merge server channels with scan statuses
    const channels = useMemo(() => {
        return serverChannels.map(channel => ({
            channelId: channel.id,
            channelName: channel.name,
            messageScanEnabled: channel.message_scan_enabled,
            status: scanStatusMap[channel.id]?.status || null,
            messageCount: scanStatusMap[channel.id]?.message_count || 0,
            totalMessagesScanned:
                scanStatusMap[channel.id]?.total_messages_scanned || 0,
            updatedAt: scanStatusMap[channel.id]?.updated_at || null,
            errorMessage: scanStatusMap[channel.id]?.error_message || null,
        }));
    }, [serverChannels, scanStatusMap]);

    const unscannedCount = channels.filter(
        ch => !ch.status && ch.messageScanEnabled
    ).length;
    const activeScans = channels.filter(
        ch => ch.status === "RUNNING" || ch.status === "PENDING"
    ).length;
    const failedScans = channels.filter(
        ch => ch.status === "FAILED"
    ).length;

    const handleStartScan = (channelId: string) => {
        startScanMutation.mutate({
            channelId,
            options: {
                direction,
                limit: 100,
                autoContinue: true,
            },
        });
    };

    const handleStartSelected = async () => {
        setStarting(true);

        if (selectedChannel === "all") {
            // Scan all unscanned channels that have scanning enabled
            const unscanned = channels.filter(
                ch => !ch.status && ch.messageScanEnabled
            );
            const result = await startMultipleChannelScans(
                guildId,
                unscanned.map(ch => ch.channelId),
                { direction, limit: 100, autoContinue: true }
            );

            alert(`Started ${result.success} scans, ${result.failed} failed`);
        } else {
            // Scan selected channel
            startScanMutation.mutate({
                channelId: selectedChannel,
                options: {
                    direction,
                    limit: 100,
                    autoContinue: true,
                },
            });
        }

        setStarting(false);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6">
                    <p className="text-destructive text-sm">
                        Error:{" "}
                        {error instanceof Error
                            ? error.message
                            : "Failed to load scan statuses"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Debug: Show if no channels found
    if (channels.length === 0) {
        return (
            <div className="space-y-4">
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                    <CardHeader>
                        <CardTitle className="text-yellow-600 dark:text-yellow-400">
                            No Channels Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm">
                            This guild has no channels in the database. The Discord
                            bot needs to sync channels first.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Make sure the bot is in the server and has permission to
                            view channels.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <details className="px-6 py-4">
                        <summary className="cursor-pointer text-sm font-medium">
                            Debug Info
                        </summary>
                        <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
                            {JSON.stringify(
                                { guildId, channels, loading, error },
                                null,
                                2
                            )}
                        </pre>
                    </details>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Panel */}
            <Card className="border-blue-500/50 bg-blue-500/10">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                About Scans
                            </h3>
                            <p className="text-sm">
                                Scans process Discord messages to find and save
                                video clips. Each scan examines messages in a
                                channel and extracts clips based on your settings.
                                You can scan individual channels or all channels at
                                once.
                            </p>
                            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                <span>
                                    • <strong>{unscannedCount}</strong> unscanned
                                    channels
                                </span>
                                <span>
                                    • <strong>{activeScans}</strong> active scans
                                </span>
                                {failedScans > 0 && (
                                    <span className="text-destructive">
                                        • <strong>{failedScans}</strong> failed
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Start New Scan Panel */}
            <Card>
                <CardHeader>
                    <CardTitle>Start New Scan</CardTitle>
                    <CardDescription>
                        Configure and start a new message scan
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Channel Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="channel-select">Channel</Label>
                        <select
                            id="channel-select"
                            value={selectedChannel}
                            onChange={e => setSelectedChannel(e.target.value)}
                            className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-background [&>optgroup]:bg-muted"
                        >
                            <option value="all">
                                All Unscanned Channels ({unscannedCount})
                            </option>
                            <optgroup label="Individual Channels">
                                {channels.map(ch => (
                                    <option
                                        key={ch.channelId}
                                        value={ch.channelId}
                                        disabled={!ch.messageScanEnabled}
                                    >
                                        #{ch.channelName}{" "}
                                        {!ch.messageScanEnabled
                                            ? "(Disabled)"
                                            : ch.status
                                            ? `(${ch.status})`
                                            : "(Not scanned)"}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Direction Toggle */}
                    <div className="space-y-2">
                        <Label>Scan Direction</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={direction === "backward" ? "default" : "outline"}
                                onClick={() => setDirection("backward")}
                                className="flex-1"
                            >
                                <ArrowDown className="h-4 w-4" />
                                Newest First
                            </Button>
                            <Button
                                type="button"
                                variant={direction === "forward" ? "default" : "outline"}
                                onClick={() => setDirection("forward")}
                                className="flex-1"
                            >
                                <ArrowUp className="h-4 w-4" />
                                Oldest First
                            </Button>
                        </div>
                    </div>

                    {/* Start Button */}
                    <Button
                        onClick={handleStartSelected}
                        disabled={
                            starting ||
                            (selectedChannel === "all" && unscannedCount === 0)
                        }
                        className="w-full"
                        size="lg"
                    >
                        <Play className="h-4 w-4" />
                        {starting
                            ? "Starting..."
                            : selectedChannel === "all"
                            ? `Start Scanning ${unscannedCount} Channels`
                            : "Start Scan"}
                    </Button>
                </CardContent>
            </Card>

            {/* Scan Status Table */}
            <Card className="overflow-hidden">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle>Scan Status</CardTitle>
                        <Button
                            onClick={() => refetch()}
                            variant="outline"
                            size="sm"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-semibold text-sm">
                                    Channel
                                </th>
                                <th className="text-left p-3 font-semibold text-sm">
                                    Status
                                </th>
                                <th className="text-right p-3 font-semibold text-sm">
                                    Clips
                                </th>
                                <th className="text-right p-3 font-semibold text-sm">
                                    Scanned
                                </th>
                                <th className="text-right p-3 font-semibold text-sm">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map(channel => (
                                <tr
                                    key={channel.channelId}
                                    className="border-t hover:bg-muted/50"
                                >
                                    <td className="p-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm">
                                                    #{channel.channelName}
                                                </span>
                                                {!channel.messageScanEnabled && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Disabled
                                                    </Badge>
                                                )}
                                            </div>
                                            {channel.errorMessage && (
                                                <div className="flex items-start gap-1.5 text-xs text-destructive">
                                                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                                    <span className="line-clamp-2">{channel.errorMessage}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={channel.status} />
                                    </td>
                                    <td className="p-3 text-right text-muted-foreground text-sm">
                                        {channel.messageCount || "-"}
                                    </td>
                                    <td className="p-3 text-right text-muted-foreground text-sm">
                                        {channel.totalMessagesScanned || "-"}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button
                                            onClick={() =>
                                                handleStartScan(channel.channelId)
                                            }
                                            disabled={
                                                !channel.messageScanEnabled ||
                                                startScanMutation.isPending ||
                                                channel.status === "RUNNING" ||
                                                channel.status === "PENDING"
                                            }
                                            variant="outline"
                                            size="sm"
                                            title={
                                                !channel.messageScanEnabled
                                                    ? "Enable scanning in Overview tab first"
                                                    : ""
                                            }
                                        >
                                            {!channel.messageScanEnabled
                                                ? "Disabled"
                                                : startScanMutation.isPending
                                                ? "Starting..."
                                                : channel.status === "RUNNING"
                                                ? "Running..."
                                                : channel.status === "PENDING"
                                                ? "Queued..."
                                                : "Scan"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {channels.length === 0 && (
                        <div className="p-6 text-center text-muted-foreground">
                            No channels found
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    if (!status) {
        return <Badge variant="outline">Not scanned</Badge>;
    }

    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        PENDING: "secondary",
        RUNNING: "default",
        SUCCEEDED: "outline",
        FAILED: "destructive",
        CANCELLED: "outline",
    };

    const colorMap: Record<string, string> = {
        PENDING: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50",
        RUNNING: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50",
        SUCCEEDED: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50",
    };

    const variant = variantMap[status] || "outline";
    const customColor = colorMap[status];

    return (
        <Badge variant={variant} className={customColor}>
            {status}
        </Badge>
    );
}
