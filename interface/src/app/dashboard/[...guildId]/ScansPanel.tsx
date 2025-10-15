"use client";

import { useScanStatuses, useStartScan } from '@/lib/hooks/queries';
import { startMultipleChannelScans } from "@/lib/actions/scan";
import { useState, useMemo } from "react";
import type { Channel } from "@/lib/db/types";

interface ScansPanelProps {
    guildId: string;
    channels: Channel[];
}

export function ScansPanel({
    guildId,
    channels: serverChannels,
}: ScansPanelProps) {
    const { data: scanStatuses = [], isLoading: loading, error, refetch } = useScanStatuses(guildId);
    const startScanMutation = useStartScan(guildId);
    const [selectedChannel, setSelectedChannel] = useState<string>("all");
    const [direction, setDirection] = useState<"backward" | "forward">(
        "backward"
    );
    const [starting, setStarting] = useState(false);

    // Convert array to map for easier lookup
    const scanStatusMap = useMemo(() => {
        const map: Record<string, typeof scanStatuses[0]> = {};
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
        }));
    }, [serverChannels, scanStatusMap]);

    // Debug logging
    console.log("ScansPanel Debug:", {
        guildId,
        serverChannelsLength: serverChannels.length,
        channelsLength: channels.length,
        scanStatusesCount: scanStatuses.length,
        channels,
        serverChannels: serverChannels.map(ch => ({
            id: ch.id,
            name: ch.name,
            message_scan_enabled: ch.message_scan_enabled,
        })),
        loading,
        error,
    });

    const unscannedCount = channels.filter(
        ch => !ch.status && ch.messageScanEnabled
    ).length;
    const activeScans = channels.filter(
        ch => ch.status === "RUNNING" || ch.status === "PENDING"
    ).length;

    const handleStartScan = (channelId: string) => {
        console.log("Starting scan for channel:", channelId);
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
            <div className="p-6 border border-white/20 rounded-lg">
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 border border-red-500/20 rounded-lg bg-red-500/5">
                <p className="text-red-400">
                    Error: {error instanceof Error ? error.message : 'Failed to load scan statuses'}
                </p>
            </div>
        );
    }

    // Debug: Show if no channels found
    if (channels.length === 0) {
        return (
            <div className="space-y-4">
                <div className="p-6 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
                    <h3 className="text-yellow-400 font-semibold mb-2">
                        No Channels Found
                    </h3>
                    <p className="text-sm text-gray-300">
                        This guild has no channels in the database. The Discord
                        bot needs to sync channels first.
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        Make sure the bot is in the server and has permission to
                        view channels.
                    </p>
                </div>
                <details className="p-4 border border-white/20 rounded-lg bg-white/5">
                    <summary className="cursor-pointer text-sm font-medium">
                        Debug Info
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 overflow-auto">
                        {JSON.stringify(
                            { guildId, channels, loading, error },
                            null,
                            2
                        )}
                    </pre>
                </details>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Panel */}
            <div className="p-4 border border-blue-500/20 rounded-lg bg-blue-500/5">
                <div className="flex items-start gap-3">
                    <svg
                        className="w-5 h-5 text-blue-400 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-400 mb-1">
                            About Scans
                        </h3>
                        <p className="text-sm text-gray-300">
                            Scans process Discord messages to find and save
                            video clips. Each scan examines messages in a
                            channel and extracts clips based on your settings.
                            You can scan individual channels or all channels at
                            once.
                        </p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-400">
                            <span>
                                • <strong>{unscannedCount}</strong> unscanned
                                channels
                            </span>
                            <span>
                                • <strong>{activeScans}</strong> active scans
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Start New Scan Panel */}
            <div className="p-6 border border-white/20 rounded-lg bg-white/5">
                <h2 className="text-xl font-bold mb-4">Start New Scan</h2>

                <div className="space-y-4">
                    {/* Channel Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Channel
                        </label>
                        <select
                            value={selectedChannel}
                            onChange={e => setSelectedChannel(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-gray-900 [&>option]:text-white [&>optgroup]:bg-gray-800 [&>optgroup]:text-gray-300"
                        >
                            <option
                                value="all"
                                className="bg-gray-900 text-white"
                            >
                                All Unscanned Channels ({unscannedCount})
                            </option>
                            <optgroup
                                label="Individual Channels"
                                className="bg-gray-800 text-gray-300"
                            >
                                {channels.map(ch => (
                                    <option
                                        key={ch.channelId}
                                        value={ch.channelId}
                                        className="bg-gray-900 text-white"
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
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Scan Direction
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDirection("backward")}
                                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                    direction === "backward"
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
                                }`}
                            >
                                <div className="text-sm font-medium">
                                    Backward
                                </div>
                                <div className="text-xs opacity-75">
                                    Newest → Oldest
                                </div>
                            </button>
                            <button
                                onClick={() => setDirection("forward")}
                                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                    direction === "forward"
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10"
                                }`}
                            >
                                <div className="text-sm font-medium">
                                    Forward
                                </div>
                                <div className="text-xs opacity-75">
                                    Oldest → Newest
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={handleStartSelected}
                        disabled={
                            starting ||
                            (selectedChannel === "all" && unscannedCount === 0)
                        }
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                        {starting
                            ? "Starting..."
                            : selectedChannel === "all"
                            ? `Start Scanning ${unscannedCount} Channels`
                            : "Start Scan"}
                    </button>
                </div>
            </div>

            {/* Scan Status Table */}
            <div className="border border-white/20 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10">
                    <h2 className="text-xl font-bold">Scan Status</h2>
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/5"
                    >
                        Refresh
                    </button>
                </div>

                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="text-left p-3 font-semibold">
                                Channel
                            </th>
                            <th className="text-left p-3 font-semibold">
                                Status
                            </th>
                            <th className="text-right p-3 font-semibold">
                                Clips
                            </th>
                            <th className="text-right p-3 font-semibold">
                                Scanned
                            </th>
                            <th className="text-right p-3 font-semibold">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {channels.map(channel => (
                            <tr
                                key={channel.channelId}
                                className="border-t border-white/10 hover:bg-white/5"
                            >
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm">
                                            #{channel.channelName}
                                        </span>
                                        {!channel.messageScanEnabled && (
                                            <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <StatusBadge status={channel.status} />
                                </td>
                                <td className="p-3 text-right text-gray-400">
                                    {channel.messageCount || "-"}
                                </td>
                                <td className="p-3 text-right text-gray-400">
                                    {channel.totalMessagesScanned || "-"}
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() =>
                                            handleStartScan(channel.channelId)
                                        }
                                        disabled={
                                            !channel.messageScanEnabled ||
                                            startScanMutation.isPending ||
                                            channel.status === "RUNNING" ||
                                            channel.status === "PENDING"
                                        }
                                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
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
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {channels.length === 0 && (
                    <div className="p-6 text-center text-gray-400">
                        No channels found
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    if (!status) {
        return (
            <span className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400">
                Not scanned
            </span>
        );
    }

    const colors = {
        PENDING: "bg-yellow-500/20 text-yellow-400",
        RUNNING: "bg-blue-500/20 text-blue-400",
        SUCCEEDED: "bg-green-500/20 text-green-400",
        FAILED: "bg-red-500/20 text-red-400",
        CANCELLED: "bg-gray-500/20 text-gray-400",
    };

    return (
        <span
            className={`px-2 py-1 text-xs rounded ${
                colors[status as keyof typeof colors] ||
                "bg-gray-500/20 text-gray-400"
            }`}
        >
            {status}
        </span>
    );
}
