"use client";

import { useToggleScanning } from '@/lib/hooks/queries';
import type { Guild } from '@/lib/db/types';

interface GuildHeaderProps {
    guildId: string;
    guildName: string;
    ownerId: string | null;
    messageScanEnabled: boolean;
    lastMessageScanAt: Date | null;
    createdAt: Date;
    iconUrl: string | null;
}

export default function GuildHeader({
    guildId,
    guildName,
    ownerId,
    messageScanEnabled,
    lastMessageScanAt,
    createdAt,
    iconUrl,
}: GuildHeaderProps) {
    const toggleMutation = useToggleScanning(guildId);

    const handleToggle = () => {
        toggleMutation.mutate(!messageScanEnabled);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">{guildName}</h1>
                <p className="text-sm text-muted-foreground">
                    Guild ID: {guildId}
                </p>
            </div>

            {toggleMutation.isError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">
                        {toggleMutation.error instanceof Error 
                            ? toggleMutation.error.message 
                            : 'Failed to toggle scanning'}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard title="Owner" value={ownerId ?? "Unclaimed"} />

                {/* Message Scanning Card with Toggle */}
                <div className="p-4 border border-white/20 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                                    Message Scanning
                                </h3>
                                <p
                                    className={`text-lg font-semibold ${
                                        messageScanEnabled
                                            ? "text-green-500"
                                            : "text-gray-500"
                                    }`}
                                >
                                    {messageScanEnabled
                                        ? "Enabled"
                                        : "Disabled"}
                                </p>
                            </div>
                            <div className="group relative">
                                <button className="text-gray-400 hover:text-gray-300">
                                    <svg
                                        className="w-4 h-4"
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
                                </button>
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 border border-white/20 rounded text-xs text-gray-300 z-10">
                                    This only allows scans to happen, it does
                                    not start them. Use the Scans tab to start
                                    scanning channels.
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleToggle}
                            disabled={toggleMutation.isPending}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                messageScanEnabled
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-green-600 text-white hover:bg-green-700"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {toggleMutation.isPending
                                ? "Updating..."
                                : messageScanEnabled
                                ? "Turn Off"
                                : "Turn On"}
                        </button>
                    </div>
                </div>

                <InfoCard
                    title="Last Message Scan"
                    value={
                        lastMessageScanAt
                            ? new Date(lastMessageScanAt).toLocaleString()
                            : "Never"
                    }
                />
                <InfoCard
                    title="Created At"
                    value={new Date(createdAt).toLocaleString()}
                />
            </div>

            {iconUrl && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-2">Guild Icon</h2>
                    <img
                        src={iconUrl}
                        alt={`${guildName} icon`}
                        className="w-32 h-32 rounded-xl"
                    />
                </div>
            )}
        </div>
    );
}

function InfoCard({
    title,
    value,
    valueClass = "text-white",
}: {
    title: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="p-4 border border-white/20 rounded-lg bg-white/5">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {title}
            </h3>
            <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
        </div>
    );
}
