"use client";

import { useBulkUpdateChannels, useGuild, useChannels } from "@/lib/hooks/queries";
import type { Channel } from "@/lib/db/types";
import { Button } from "@/components/ui/button";

type ChannelsListProps = {
    channels: Channel[];
    guildId: string;
    guildScanEnabled: boolean;
};

export default function ChannelsList({
    channels: initialChannels,
    guildId,
    guildScanEnabled: initialGuildScanEnabled,
}: ChannelsListProps) {
    const bulkUpdateMutation = useBulkUpdateChannels(guildId);

    // Track live guild state from React Query cache
    const { data: guild } = useGuild(guildId);
    const guildScanEnabled =
        guild?.message_scan_enabled ?? initialGuildScanEnabled;

    // Track live channels state from React Query cache
    const { data: channels } = useChannels(guildId, initialChannels);
    const channelsList = channels ?? initialChannels;

    const enabledCount = channelsList.filter(c => c.message_scan_enabled).length;
    const allEnabled = enabledCount === channelsList.length;
    const allDisabled = enabledCount === 0;

    const handleBulkToggle = (enabled: boolean) => {
        bulkUpdateMutation.mutate(enabled);
    };

    return (
        <div className="mt-6">
            {/* Channel Controls */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">
                    Channels ({channelsList.length})
                    <span className="text-sm text-muted-foreground ml-2">
                        {enabledCount} enabled
                    </span>
                </h2>

                {channelsList.length > 0 && (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleBulkToggle(true)}
                            disabled={
                                bulkUpdateMutation.isPending || allEnabled
                            }
                            size="sm"
                            variant="ghost"
                        >
                            {bulkUpdateMutation.isPending
                                ? "Updating..."
                                : "Enable All"}
                        </Button>
                        <Button
                            onClick={() => handleBulkToggle(false)}
                            disabled={
                                bulkUpdateMutation.isPending || allDisabled
                            }
                            size="sm"
                            variant="ghost"
                        >
                            {bulkUpdateMutation.isPending
                                ? "Updating..."
                                : "Disable All"}
                        </Button>
                    </div>
                )}
            </div>

            {bulkUpdateMutation.isError && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">
                        {bulkUpdateMutation.error instanceof Error
                            ? bulkUpdateMutation.error.message
                            : "Failed to update channels"}
                    </p>
                </div>
            )}

            {channelsList.length === 0 ? (
                <p className="text-muted-foreground">
                    No channels found for this guild.
                </p>
            ) : (
                <div className="space-y-2">
                    {channelsList.map(channel => (
                        <ChannelItem
                            key={channel.id}
                            channel={channel}
                            guildScanEnabled={guildScanEnabled}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChannelItem({
    channel,
    guildScanEnabled,
}: {
    channel: Channel;
    guildScanEnabled: boolean;
}) {
    return (
        <div
            key={channel.id}
            className="p-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">#{channel.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
                            {channel.type}
                        </span>
                        {channel.nsfw && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                                NSFW
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        ID: {channel.id}
                    </p>
                    {channel.topic && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {channel.topic}
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span
                        className={`text-xs px-2 py-1 rounded ${
                            !guildScanEnabled && channel.message_scan_enabled
                                ? "bg-orange-500/20 text-orange-400"
                                : channel.message_scan_enabled
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                        }`}
                    >
                        {!guildScanEnabled && channel.message_scan_enabled
                            ? "Scan: Ready"
                            : channel.message_scan_enabled
                            ? "Scan: ON"
                            : "Scan: OFF"}
                    </span>
                    {channel.last_channel_sync_at && (
                        <span className="text-xs text-muted-foreground">
                            Last sync:{" "}
                            {new Date(
                                channel.last_channel_sync_at
                            ).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
