import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ChannelWithStatus, ChannelType } from "./types";
import { formatRelativeTime } from "@/lib/utils/time";

interface ScanStatusTableProps {
    channels: ChannelWithStatus[];
    isPending: boolean;
    onRefresh: () => void;
    onStartScan: (channelId: string) => void;
}

export function ScanStatusTable({
    channels,
    isPending,
    onRefresh,
    onStartScan,
}: ScanStatusTableProps) {
    // Group channels by type and sort alphabetically within each group
    const groupedChannels = useMemo(() => {
        const groups: Record<ChannelType, ChannelWithStatus[]> = {
            text: [],
            voice: [],
            forum: [],
            category: [],
        };

        // Group channels by type
        channels.forEach(channel => {
            groups[channel.channelType].push(channel);
        });

        // Sort each group alphabetically by name
        Object.keys(groups).forEach(type => {
            groups[type as ChannelType].sort((a, b) =>
                a.channelName.localeCompare(b.channelName)
            );
        });

        return groups;
    }, [channels]);

    // Get channel type label for display
    const getTypeLabel = (type: ChannelType): string => {
        const labels: Record<ChannelType, string> = {
            text: "Text Channels",
            voice: "Voice Channels",
            forum: "Forum Channels",
            category: "Categories",
        };
        return labels[type];
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <CardTitle>Scan Status</CardTitle>
                    <Button onClick={onRefresh} variant="outline" size="sm">
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
                                Last Scan
                            </th>
                            <th className="text-right p-3 font-semibold text-sm">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(
                            [
                                "text",
                                "voice",
                                "forum",
                                "category",
                            ] as ChannelType[]
                        ).map(type => {
                            const channelsOfType = groupedChannels[type];
                            if (channelsOfType.length === 0) return null;

                            return (
                                <React.Fragment key={type}>
                                    {/* Type header row */}
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="p-3 bg-muted/30 font-semibold text-sm text-muted-foreground"
                                        >
                                            {getTypeLabel(type)}
                                        </td>
                                    </tr>
                                    {/* Channel rows */}
                                    {channelsOfType.map(channel => (
                                        <tr
                                            key={channel.channelId}
                                            className="border-t hover:bg-muted/50"
                                        >
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm">
                                                            #
                                                            {
                                                                channel.channelName
                                                            }
                                                        </span>
                                                        {!channel.messageScanEnabled && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-xs"
                                                            >
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {channel.errorMessage && (
                                                        <div className="flex items-start gap-1.5 text-xs text-destructive">
                                                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                                            <span className="line-clamp-2">
                                                                {
                                                                    channel.errorMessage
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <StatusBadge
                                                    status={channel.status}
                                                />
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground text-sm">
                                                {channel.messageCount || "-"}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground text-sm">
                                                {channel.totalMessagesScanned ||
                                                    "-"}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground text-sm">
                                                {formatRelativeTime(
                                                    channel.updatedAt
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button
                                                    onClick={() =>
                                                        onStartScan(
                                                            channel.channelId
                                                        )
                                                    }
                                                    disabled={
                                                        !channel.messageScanEnabled ||
                                                        isPending ||
                                                        channel.status ===
                                                            "RUNNING" ||
                                                        channel.status ===
                                                            "PENDING"
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
                                                        : isPending
                                                        ? "Starting..."
                                                        : channel.status ===
                                                          "RUNNING"
                                                        ? "Running..."
                                                        : channel.status ===
                                                          "PENDING"
                                                        ? "Queued..."
                                                        : "Scan"}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {channels.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                        No channels found
                    </div>
                )}
            </div>
        </Card>
    );
}
