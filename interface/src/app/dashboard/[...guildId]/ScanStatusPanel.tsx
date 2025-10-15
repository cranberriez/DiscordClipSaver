"use client";

import { useGuildScanStatuses } from "@/lib/hooks/useScanStatus";
import { startChannelScan } from "@/lib/actions/scan";
import { useState } from "react";

interface ScanStatusPanelProps {
    guildId: string;
}

export function ScanStatusPanel({ guildId }: ScanStatusPanelProps) {
    const { channels, loading, error, refetch } = useGuildScanStatuses(guildId);
    const [scanning, setScanning] = useState<Record<string, boolean>>({});

    const handleStartScan = async (channelId: string) => {
        setScanning(prev => ({ ...prev, [channelId]: true }));
        
        const result = await startChannelScan(guildId, channelId, {
            direction: "backward",
            limit: 100,
            autoContinue: true,
        });
        
        if (result.success) {
            // Refetch to show updated status
            setTimeout(() => refetch(), 1000);
        } else {
            alert(`Failed to start scan: ${result.error}`);
        }
        
        setScanning(prev => ({ ...prev, [channelId]: false }));
    };

    if (loading) {
        return (
            <div className="p-6 border border-white/20 rounded-lg">
                <p className="text-gray-400">Loading scan statuses...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 border border-red-500/20 rounded-lg bg-red-500/5">
                <p className="text-red-400">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Channel Scan Status</h2>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/5"
                >
                    Refresh
                </button>
            </div>

            <div className="border border-white/20 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="text-left p-3 font-semibold">Channel</th>
                            <th className="text-left p-3 font-semibold">Status</th>
                            <th className="text-right p-3 font-semibold">Messages</th>
                            <th className="text-right p-3 font-semibold">Scanned</th>
                            <th className="text-right p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {channels.map(channel => (
                            <tr
                                key={channel.channelId}
                                className="border-t border-white/10 hover:bg-white/5"
                            >
                                <td className="p-3">
                                    <span className="font-mono text-sm">
                                        #{channel.channelName}
                                    </span>
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
                                        onClick={() => handleStartScan(channel.channelId)}
                                        disabled={
                                            scanning[channel.channelId] ||
                                            channel.status === "RUNNING" ||
                                            channel.status === "PENDING"
                                        }
                                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
                                    >
                                        {scanning[channel.channelId]
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
            </div>

            {channels.length === 0 && (
                <div className="p-6 text-center text-gray-400">
                    No channels found
                </div>
            )}
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
        <span className={`px-2 py-1 text-xs rounded ${colors[status as keyof typeof colors] || "bg-gray-500/20 text-gray-400"}`}>
            {status}
        </span>
    );
}
