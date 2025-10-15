"use client";

import { useToggleScanning, useGuild } from "@/lib/hooks/queries";
import type { Guild } from "@/lib/db/types";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Info, Scan, CheckCircle2, XCircle } from "lucide-react";

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
    messageScanEnabled: initialMessageScanEnabled,
    lastMessageScanAt,
    createdAt,
    iconUrl,
}: GuildHeaderProps) {
    // Use React Query to track live state
    const { data: guild } = useGuild(guildId, {
        id: guildId,
        name: guildName,
        owner_id: ownerId,
        message_scan_enabled: initialMessageScanEnabled,
        last_message_scan_at: lastMessageScanAt,
        created_at: createdAt,
        icon_url: iconUrl,
    } as Guild);

    const toggleMutation = useToggleScanning(guildId);
    const messageScanEnabled =
        guild?.message_scan_enabled ?? initialMessageScanEnabled;

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
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="pt-6">
                        <p className="text-destructive text-sm">
                            {toggleMutation.error instanceof Error
                                ? toggleMutation.error.message
                                : "Failed to toggle scanning"}
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Message Scanning Card with Switch */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg">
                                        Message Scanning
                                    </CardTitle>
                                </div>
                                <CardDescription className="flex items-start gap-2">
                                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                        This controls whether scans are allowed
                                        to run. Use the Scans tab to configure
                                        and start scanning specific channels.
                                    </span>
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={messageScanEnabled}
                                    onCheckedChange={handleToggle}
                                    disabled={toggleMutation.isPending}
                                    className="data-[state=checked]:bg-green-600"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            {messageScanEnabled ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="flex gap-2 items-baseline">
                                <p className="font-semibold text-lg">
                                    {messageScanEnabled ? "Active" : "Inactive"}
                                </p>
                                {toggleMutation.isPending && (
                                    <p className="text-xs text-muted-foreground">
                                        Updating...
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
    valueClass = "text-foreground",
}: {
    title: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>{title}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
            </CardContent>
        </Card>
    );
}
