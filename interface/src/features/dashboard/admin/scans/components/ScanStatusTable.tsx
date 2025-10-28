import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ChannelWithStatus } from "../types";
import { formatRelativeTime } from "@/lib/utils/time-helpers";
import {
    groupChannelsByType,
    getSortedChannelTypes,
    ChannelTypeHeader,
} from "@/components/composite/ChannelOrganizer";
import { ChannelScanButton } from "./ChannelScanButton";
import { useScanVisibilityStore } from "../stores/useScanVisibilityStore";

interface ScanStatusTableProps {
    channels: ChannelWithStatus[];
    onRefresh: () => void;
}

export function ScanStatusTable({ channels, onRefresh }: ScanStatusTableProps) {
    const { showDisabledChannels, toggleShowDisabledChannels } =
        useScanVisibilityStore();

    // Filter channels based on visibility setting
    const filteredChannels = useMemo(
        () =>
            showDisabledChannels
                ? channels
                : channels.filter(ch => ch.message_scan_enabled),
        [channels, showDisabledChannels]
    );

    // Group channels by type and sort alphabetically by name within each group
    const groupedChannels = useMemo(
        () => groupChannelsByType(filteredChannels, "name"),
        [filteredChannels]
    );

    // Get sorted channel types based on configured display order
    const sortedChannelTypes = useMemo(() => getSortedChannelTypes(), []);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <CardTitle>Scan Status</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={toggleShowDisabledChannels}
                            variant="outline"
                            size="sm"
                        >
                            {showDisabledChannels ? (
                                <>
                                    <EyeOff className="h-4 w-4" />
                                    Hide Disabled
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4" />
                                    Show Disabled
                                </>
                            )}
                        </Button>
                        <Button onClick={onRefresh} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
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
                        {sortedChannelTypes.map(type => {
                            const channelsOfType = groupedChannels[type];
                            if (channelsOfType.length === 0) return null;

                            return (
                                <React.Fragment key={type}>
                                    {/* Type header row */}
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="p-3 bg-muted/30"
                                        >
                                            <ChannelTypeHeader type={type} />
                                        </td>
                                    </tr>
                                    {/* Channel rows */}
                                    {channelsOfType.map(channel => (
                                        <tr
                                            key={channel.id}
                                            className="border-t hover:bg-muted/50"
                                        >
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-base">
                                                            {channel.name}
                                                        </span>
                                                        {!channel.message_scan_enabled && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-xs"
                                                            >
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {channel.scanStatus
                                                        ?.error_message && (
                                                        <div className="flex items-start gap-1.5 text-xs text-destructive">
                                                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                                            <span className="line-clamp-2">
                                                                {
                                                                    channel
                                                                        .scanStatus
                                                                        ?.error_message
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <StatusBadge
                                                    status={
                                                        channel.scanStatus
                                                            ?.status || ""
                                                    }
                                                />
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground text-sm">
                                                {channel.scanStatus
                                                    ?.message_count || "-"}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground text-sm">
                                                {channel.scanStatus
                                                    ?.total_messages_scanned ||
                                                    "-"}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground text-sm">
                                                {formatRelativeTime(
                                                    channel.scanStatus
                                                        ?.updated_at || ""
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <ChannelScanButton
                                                    channel={channel}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {filteredChannels.length === 0 && channels.length > 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                        All channels are disabled. Click &quot;Show
                        Disabled&quot; to view them.
                    </div>
                )}
                {channels.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                        No channels found
                    </div>
                )}
            </div>
        </Card>
    );
}
