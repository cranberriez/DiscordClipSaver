import type { Channel } from "@/lib/db/types";

type ChannelsListProps = {
    channels: Channel[];
};

export default function ChannelsList({ channels }: ChannelsListProps) {
    return (
        <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3">
                Channels ({channels.length})
            </h2>
            {channels.length === 0 ? (
                <p className="text-muted-foreground">
                    No channels found for this guild.
                </p>
            ) : (
                <div className="space-y-2">
                    {channels.map(channel => (
                        <ChannelItem key={channel.id} channel={channel} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChannelItem({ channel }: { channel: Channel }) {
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
                            channel.message_scan_enabled
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                        }`}
                    >
                        {channel.message_scan_enabled
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
