"use client";

import { useScanStatuses, useStartScan } from "@/lib/hooks/queries";
import { startMultipleChannelScans } from "@/lib/actions/scan";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { guildKeys } from "@/lib/hooks/queries/useGuilds";
import type { Channel, ChannelScanStatus } from "@/lib/db/types";
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
import { Info, RefreshCw, Play, AlertCircle } from "lucide-react";

interface ScansPanelProps {
    guildId: string;
    channels: Channel[];
}

export function ScansPanel({
    guildId,
    channels: serverChannels,
}: ScansPanelProps) {
    const queryClient = useQueryClient();
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

    const unscannedOrFailedCount = channels.filter(
        ch => (!ch.status || ch.status === "FAILED") && ch.messageScanEnabled
    ).length;
    const activeScans = channels.filter(
        ch => ch.status === "RUNNING" || ch.status === "PENDING"
    ).length;
    const successfulScans = channels.filter(
        ch => ch.status === "SUCCEEDED" && ch.messageScanEnabled
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
            ch => (!ch.status || ch.status === "FAILED") && ch.messageScanEnabled
        );
        
        const channelIds = toScan.map(ch => ch.channelId);
        
        if (channelIds.length === 0) {
            alert("No unscanned or failed channels found");
            setStartingUnscanned(false);
            return;
        }
        
        // Optimistically update scan statuses to PENDING immediately
        queryClient.setQueryData(guildKeys.scanStatuses(guildId), (old: any) => {
            if (!old?.statuses) return old;
            
            const statuses = [...old.statuses] as ChannelScanStatus[];
            
            channelIds.forEach(channelId => {
                const existingIndex = statuses.findIndex(s => s.channel_id === channelId);
                const optimisticStatus: ChannelScanStatus = {
                    channel_id: channelId,
                    guild_id: guildId,
                    status: 'PENDING',
                    message_count: existingIndex >= 0 ? statuses[existingIndex].message_count : 0,
                    total_messages_scanned: existingIndex >= 0 ? statuses[existingIndex].total_messages_scanned : 0,
                    forward_message_id: existingIndex >= 0 ? statuses[existingIndex].forward_message_id : null,
                    backward_message_id: existingIndex >= 0 ? statuses[existingIndex].backward_message_id : null,
                    created_at: existingIndex >= 0 ? statuses[existingIndex].created_at : new Date(),
                    updated_at: new Date(),
                    error_message: null,
                };
                
                if (existingIndex >= 0) {
                    statuses[existingIndex] = optimisticStatus;
                } else {
                    statuses.push(optimisticStatus);
                }
            });
            
            return { ...old, statuses };
        });
        
        // Start the scans (isUpdate: false = initial/continuation scan, rescan: "stop")
        const result = await startMultipleChannelScans(
            guildId,
            channelIds,
            { isUpdate: false, limit: 100, autoContinue: true, rescan: "stop" }
        );

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
        
        // Optimistically update scan statuses to PENDING immediately
        queryClient.setQueryData(guildKeys.scanStatuses(guildId), (old: any) => {
            if (!old?.statuses) return old;
            
            const statuses = [...old.statuses] as ChannelScanStatus[];
            
            channelIds.forEach(channelId => {
                const existingIndex = statuses.findIndex(s => s.channel_id === channelId);
                const optimisticStatus: ChannelScanStatus = {
                    channel_id: channelId,
                    guild_id: guildId,
                    status: 'PENDING',
                    message_count: existingIndex >= 0 ? statuses[existingIndex].message_count : 0,
                    total_messages_scanned: existingIndex >= 0 ? statuses[existingIndex].total_messages_scanned : 0,
                    forward_message_id: existingIndex >= 0 ? statuses[existingIndex].forward_message_id : null,
                    backward_message_id: existingIndex >= 0 ? statuses[existingIndex].backward_message_id : null,
                    created_at: existingIndex >= 0 ? statuses[existingIndex].created_at : new Date(),
                    updated_at: new Date(),
                    error_message: null,
                };
                
                if (existingIndex >= 0) {
                    statuses[existingIndex] = optimisticStatus;
                } else {
                    statuses.push(optimisticStatus);
                }
            });
            
            return { ...old, statuses };
        });
        
        // Start the scans (isUpdate: true = forward scan from last position, rescan: "stop")
        const result = await startMultipleChannelScans(
            guildId,
            channelIds,
            { isUpdate: true, limit: 100, autoContinue: true, rescan: "stop" }
        );

        alert(`Started ${result.success} update scans, ${result.failed} failed`);
        
        // Refetch to get actual server state
        refetch();
        setStartingUpdate(false);
    };

    const handleHistoricalScan = async (rescanMode: "stop" | "continue" | "update") => {
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
            update: "Force Update (reprocesses all messages)"
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
        
        // Optimistically update scan statuses to PENDING
        queryClient.setQueryData(guildKeys.scanStatuses(guildId), (old: any) => {
            if (!old?.statuses) return old;
            
            const statuses = [...old.statuses] as ChannelScanStatus[];
            
            channelIds.forEach(channelId => {
                const existingIndex = statuses.findIndex(s => s.channel_id === channelId);
                const optimisticStatus: ChannelScanStatus = {
                    channel_id: channelId,
                    guild_id: guildId,
                    status: 'PENDING',
                    message_count: existingIndex >= 0 ? statuses[existingIndex].message_count : 0,
                    total_messages_scanned: existingIndex >= 0 ? statuses[existingIndex].total_messages_scanned : 0,
                    forward_message_id: existingIndex >= 0 ? statuses[existingIndex].forward_message_id : null,
                    backward_message_id: existingIndex >= 0 ? statuses[existingIndex].backward_message_id : null,
                    created_at: existingIndex >= 0 ? statuses[existingIndex].created_at : new Date(),
                    updated_at: new Date(),
                    error_message: null,
                };
                
                if (existingIndex >= 0) {
                    statuses[existingIndex] = optimisticStatus;
                } else {
                    statuses.push(optimisticStatus);
                }
            });
            
            return { ...old, statuses };
        });
        
        // Start historical scans (backward from beginning with specified rescan mode)
        const result = await startMultipleChannelScans(
            guildId,
            channelIds,
            { isUpdate: false, isHistorical: true, limit: 100, autoContinue: true, rescan: rescanMode }
        );

        alert(`Started ${result.success} historical scans (${modeLabels[rescanMode]}), ${result.failed} failed`);
        
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
                                    • <strong>{unscannedOrFailedCount}</strong> unscanned/failed
                                    channels
                                </span>
                                <span>
                                    • <strong>{activeScans}</strong> active scans
                                </span>
                                <span>
                                    • <strong>{successfulScans}</strong> scanned channels
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Scan Actions Panel */}
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
                        onClick={handleScanUnscannedOrFailed}
                        disabled={
                            startingUnscanned ||
                            startingUpdate ||
                            startingHistorical ||
                            unscannedOrFailedCount === 0
                        }
                        className="w-full"
                        size="lg"
                        variant="default"
                    >
                        <Play className="h-4 w-4" />
                        {startingUnscanned
                            ? "Starting..."
                            : `Scan Unscanned or Failed Channels (${unscannedOrFailedCount})`}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Scans channels that have never been scanned or previously failed.
                        Uses channel default scan direction (forward from oldest or backward from newest).
                    </p>

                    {/* Update All Channels Button */}
                    <Button
                        onClick={handleUpdateAllChannels}
                        disabled={
                            startingUnscanned ||
                            startingUpdate ||
                            startingHistorical ||
                            channels.filter(ch => ch.messageScanEnabled).length === 0
                        }
                        className="w-full"
                        size="lg"
                        variant="secondary"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {startingUpdate
                            ? "Starting..."
                            : `Scan and Update All Channels (${channels.filter(ch => ch.messageScanEnabled).length})`}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Forward scan from the last known position to catch new messages.
                        Continues until reaching the newest message or current end.
                    </p>
                </CardContent>
            </Card>

            {/* Historical Scan Panel */}
            <Card>
                <CardHeader>
                    <CardTitle>Historical Scan</CardTitle>
                    <CardDescription>
                        Backward scan from the beginning to establish or correct scan boundaries
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Normal Historical Scan */}
                    <Button
                        onClick={() => handleHistoricalScan("stop")}
                        disabled={
                            startingUnscanned ||
                            startingUpdate ||
                            startingHistorical ||
                            channels.filter(ch => ch.messageScanEnabled).length === 0
                        }
                        className="w-full"
                        size="lg"
                        variant="outline"
                    >
                        {startingHistorical ? "Starting..." : "Normal Scan (Stop on Duplicates)"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Scans backward from channel start, stops when encountering already-scanned messages. Most efficient.
                    </p>

                    {/* Skip Existing Historical Scan */}
                    <Button
                        onClick={() => handleHistoricalScan("continue")}
                        disabled={
                            startingUnscanned ||
                            startingUpdate ||
                            startingHistorical ||
                            channels.filter(ch => ch.messageScanEnabled).length === 0
                        }
                        className="w-full"
                        size="lg"
                        variant="outline"
                    >
                        {startingHistorical ? "Starting..." : "Skip Existing (Continue Past Duplicates)"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Scans backward from channel start, skips already-scanned messages but continues scanning.
                        Use to establish correct boundaries without reprocessing.
                    </p>

                    {/* Force Update Historical Scan */}
                    <Button
                        onClick={() => handleHistoricalScan("update")}
                        disabled={
                            startingUnscanned ||
                            startingUpdate ||
                            startingHistorical ||
                            channels.filter(ch => ch.messageScanEnabled).length === 0
                        }
                        className="w-full"
                        size="lg"
                        variant="destructive"
                    >
                        {startingHistorical ? "Starting..." : "⚠️ Force Update (Reprocess All)"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Scans backward from channel start, reprocesses ALL messages including existing ones.
                        <strong className="text-destructive"> Expensive operation!</strong> Use only after settings changes.
                        Thumbnails are never regenerated if they already exist.
                    </p>
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
