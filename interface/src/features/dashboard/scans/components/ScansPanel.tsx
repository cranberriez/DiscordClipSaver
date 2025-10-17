"use client";

import { useScanStatuses, useStartScan } from "@/lib/hooks";
import { startMultipleChannelScans } from "@/lib/actions/scan";
import { useState, useMemo } from "react";
import type { Channel } from "@/lib/db/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    InfoPanel,
    BulkScanActions,
    HistoricalScanPanel,
    ScanStatusTable,
    type ChannelWithStatus,
} from "../index";

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
    const [startingUnscanned, setStartingUnscanned] = useState(false);
    const [startingUpdate, setStartingUpdate] = useState(false);
    const [startingHistorical, setStartingHistorical] = useState(false);

    // Convert array to map for easier lookup
    const scanStatusMap = useMemo(() => {
        const map: Record<string, (typeof scanStatuses)[0]> = {};
        scanStatuses.forEach(status => {
            map[status.channel_id] = status;
        });
        return map;
    }, [scanStatuses]);

    // Merge server channels with scan statuses
    const channels = useMemo<ChannelWithStatus[]>(() => {
        return serverChannels.map(channel => ({
            channelId: channel.id,
            channelName: channel.name,
            type: channel.type,
            messageScanEnabled: channel.message_scan_enabled,
            status: scanStatusMap[channel.id]?.status || null,
            messageCount: scanStatusMap[channel.id]?.message_count || 0,
            totalMessagesScanned:
                scanStatusMap[channel.id]?.total_messages_scanned || 0,
            updatedAt: scanStatusMap[channel.id]?.updated_at || null,
            errorMessage: scanStatusMap[channel.id]?.error_message || null,
        }));
    }, [serverChannels, scanStatusMap]);

    const unscannedOrFailedCount = channels.filter(
        ch => (!ch.status || ch.status === "FAILED") && ch.messageScanEnabled
    ).length;
    const activeScans = channels.filter(
        ch => ch.status === "RUNNING" || ch.status === "PENDING"
    ).length;
    const successfulScans = channels.filter(
        ch => ch.status === "SUCCEEDED" && ch.messageScanEnabled
    ).length;
    const enabledChannelsCount = channels.filter(
        ch => ch.messageScanEnabled
    ).length;

    const handleStartScan = (channelId: string, isUpdate: boolean = false) => {
        startScanMutation.mutate({
            channelId,
            options: {
                isUpdate,
                limit: 100,
                autoContinue: true,
            },
        });
    };

    const handleScanUnscannedOrFailed = async () => {
        setStartingUnscanned(true);

        // Scan channels that are unscanned or failed
        const toScan = channels.filter(
            ch =>
                (!ch.status || ch.status === "FAILED") && ch.messageScanEnabled
        );

        const channelIds = toScan.map(ch => ch.channelId);

        if (channelIds.length === 0) {
            alert("No unscanned or failed channels found");
            setStartingUnscanned(false);
            return;
        }

        // Start the scans (isUpdate: false = initial/continuation scan, rescan: "stop")
        const result = await startMultipleChannelScans(guildId, channelIds, {
            isUpdate: false,
            limit: 100,
            autoContinue: true,
            rescan: "stop",
        });

        alert(`Started ${result.success} scans, ${result.failed} failed`);

        // Refetch to get actual server state
        refetch();
        setStartingUnscanned(false);
    };

    const handleUpdateAllChannels = async () => {
        setStartingUpdate(true);

        // Update scan for all enabled channels (forward scan from last known position)
        const toUpdate = channels.filter(ch => ch.messageScanEnabled);

        const channelIds = toUpdate.map(ch => ch.channelId);

        if (channelIds.length === 0) {
            alert("No channels enabled for scanning");
            setStartingUpdate(false);
            return;
        }

        // Start the scans (isUpdate: true = forward scan from last position, rescan: "stop")
        const result = await startMultipleChannelScans(guildId, channelIds, {
            isUpdate: true,
            limit: 100,
            autoContinue: true,
            rescan: "stop",
        });

        alert(
            `Started ${result.success} update scans, ${result.failed} failed`
        );

        // Refetch to get actual server state
        refetch();
        setStartingUpdate(false);
    };

    const handleHistoricalScan = async (
        rescanMode: "stop" | "continue" | "update"
    ) => {
        setStartingHistorical(true);

        // Historical scan: backward from the beginning for all enabled channels
        const toScan = channels.filter(ch => ch.messageScanEnabled);

        const channelIds = toScan.map(ch => ch.channelId);

        if (channelIds.length === 0) {
            alert("No channels enabled for scanning");
            setStartingHistorical(false);
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
                setStartingHistorical(false);
                return;
            }
        }

        // Start historical scans (backward from beginning with specified rescan mode)
        const result = await startMultipleChannelScans(guildId, channelIds, {
            isUpdate: false,
            isHistorical: true,
            limit: 100,
            autoContinue: true,
            rescan: rescanMode,
        });

        alert(
            `Started ${result.success} historical scans (${modeLabels[rescanMode]}), ${result.failed} failed`
        );

        // Refetch to get actual server state
        refetch();
        setStartingHistorical(false);
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
                startingUnscanned={startingUnscanned}
                startingUpdate={startingUpdate}
                startingHistorical={startingHistorical}
                onScanUnscannedOrFailed={handleScanUnscannedOrFailed}
                onUpdateAllChannels={handleUpdateAllChannels}
            />

            <HistoricalScanPanel
                enabledChannelsCount={enabledChannelsCount}
                startingUnscanned={startingUnscanned}
                startingUpdate={startingUpdate}
                startingHistorical={startingHistorical}
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
