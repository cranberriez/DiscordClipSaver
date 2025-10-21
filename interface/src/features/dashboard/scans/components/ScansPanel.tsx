"use client";

import { useScanStatuses, useStartScan, useStartBulkScan } from "@/lib/hooks";
import { Channel } from "@/lib/api/channel";
import type { MultiScanResult } from "@/lib/api/scan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    InfoPanel,
    BulkScanActions,
    HistoricalScanPanel,
    ScanStatusTable,
} from "../index";
import { ChannelWithStatus } from "../types";
import { mergeChannelsWithStatuses } from "../lib/mergeChannelsWithStatuses";

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
    const startBulkScanMutation = useStartBulkScan(guildId);

    // Merge all channels with their scan statuses (channels without statuses will have scanStatus: null)
    const channels: ChannelWithStatus[] = mergeChannelsWithStatuses(
        serverChannels,
        scanStatuses
    );

    const unscannedOrFailedCount = channels.filter(
        ch =>
            (!ch.scanStatus || ch.scanStatus.status === "FAILED") &&
            ch.message_scan_enabled
    ).length;
    const activeScans = channels.filter(
        ch =>
            ch.scanStatus?.status === "RUNNING" ||
            ch.scanStatus?.status === "PENDING"
    ).length;
    const successfulScans = channels.filter(
        ch => ch.scanStatus?.status === "SUCCEEDED" && ch.message_scan_enabled
    ).length;
    const enabledChannelsCount = channels.filter(
        ch => ch.message_scan_enabled
    ).length;

    const handleStartScan = (channelId: string) => {
        startScanMutation.mutate({
            channelId,
            options: {
                isUpdate: false,
                limit: 100,
                autoContinue: true,
                rescan: "stop",
            },
        });
    };

    const handleScanUnscannedOrFailed = () => {
        // Scan channels that are unscanned or failed
        const toScan = channels.filter(
            ch =>
                (!ch.scanStatus || ch.scanStatus.status === "FAILED") &&
                ch.message_scan_enabled
        );

        const channelIds = toScan.map(ch => ch.id);

        if (channelIds.length === 0) {
            alert("No unscanned or failed channels found");
            return;
        }

        // Start the scans (isUpdate: false = initial/continuation scan, rescan: "stop")
        startBulkScanMutation.mutate(
            {
                channelIds,
                options: {
                    isUpdate: false,
                    limit: 100,
                    autoContinue: true,
                    rescan: "stop",
                },
            },
            {
                onSuccess: (result: MultiScanResult) => {
                    alert(
                        `Started ${result.success} scans, ${result.failed} failed`
                    );
                },
            }
        );
    };

    const handleUpdateAllChannels = () => {
        // Update scan for all enabled channels (forward scan from last known position)
        const toUpdate = channels.filter(ch => ch.message_scan_enabled);

        const channelIds = toUpdate.map(ch => ch.id);

        if (channelIds.length === 0) {
            alert("No channels enabled for scanning");
            return;
        }

        // Start the scans (isUpdate: true = forward scan from last position, rescan: "stop")
        startBulkScanMutation.mutate(
            {
                channelIds,
                options: {
                    isUpdate: true,
                    limit: 100,
                    autoContinue: true,
                    rescan: "stop",
                },
            },
            {
                onSuccess: (result: MultiScanResult) => {
                    alert(
                        `Started ${result.success} update scans, ${result.failed} failed`
                    );
                },
            }
        );
    };

    const handleHistoricalScan = (
        rescanMode: "stop" | "continue" | "update"
    ) => {
        // Historical scan: backward from the beginning for all enabled channels
        const toScan = channels.filter(ch => ch.message_scan_enabled);

        const channelIds = toScan.map(ch => ch.id);

        if (channelIds.length === 0) {
            alert("No channels enabled for scanning");
            return;
        }

        const modeLabels = {
            stop: "Normal (stops on duplicates)",
            continue: "Skip Existing (continues past duplicates)",
            update: "Force Update (reprocesses all messages)",
        };

        // Confirm for expensive update mode
        if (rescanMode === "update") {
            const confirmed = confirm(
                `⚠️ FORCE UPDATE MODE\n\n` +
                    `This will reprocess ALL messages in ${channelIds.length} channels, ` +
                    `even if they've already been scanned. This is expensive and should only ` +
                    `be used if settings have changed.\n\n` +
                    `Thumbnails will NOT be regenerated if they already exist.\n\n` +
                    `Continue?`
            );
            if (!confirmed) {
                return;
            }
        }

        // Start historical scans (backward from beginning with specified rescan mode)
        startBulkScanMutation.mutate(
            {
                channelIds,
                options: {
                    isUpdate: false,
                    isHistorical: true,
                    limit: 100,
                    autoContinue: true,
                    rescan: rescanMode,
                },
            },
            {
                onSuccess: (result: MultiScanResult) => {
                    alert(
                        `Started ${result.success} historical scans (${modeLabels[rescanMode]}), ${result.failed} failed`
                    );
                },
            }
        );
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
                            This guild has no channels in the database. The
                            Discord bot needs to sync channels first.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Make sure the bot is in the server and has
                            permission to view channels.
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
            <InfoPanel
                unscannedOrFailedCount={unscannedOrFailedCount}
                activeScans={activeScans}
                successfulScans={successfulScans}
            />

            <BulkScanActions
                unscannedOrFailedCount={unscannedOrFailedCount}
                enabledChannelsCount={enabledChannelsCount}
                startingUnscanned={startBulkScanMutation.isPending}
                startingUpdate={startBulkScanMutation.isPending}
                startingHistorical={startBulkScanMutation.isPending}
                onScanUnscannedOrFailed={handleScanUnscannedOrFailed}
                onUpdateAllChannels={handleUpdateAllChannels}
            />

            <HistoricalScanPanel
                enabledChannelsCount={enabledChannelsCount}
                startingUnscanned={startBulkScanMutation.isPending}
                startingUpdate={startBulkScanMutation.isPending}
                startingHistorical={startBulkScanMutation.isPending}
                onHistoricalScan={handleHistoricalScan}
            />

            <ScanStatusTable
                channels={channels}
                isPending={startScanMutation.isPending}
                onRefresh={refetch}
                onStartScan={handleStartScan}
            />
        </div>
    );
}
