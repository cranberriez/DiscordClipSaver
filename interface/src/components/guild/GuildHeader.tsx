"use client";

import { useToggleScanning } from "@/lib/hooks/queries";
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
import { Info, Image as ImageIcon } from "lucide-react";

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
                <InfoCard title="Owner" value={ownerId ?? "Unclaimed"} />

                {/* Message Scanning Card with Switch */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base">
                                    Message Scanning
                                </CardTitle>
                                <div className="group relative">
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded text-xs text-popover-foreground z-10 shadow-md">
                                        This only allows scans to happen. Use
                                        the Scans tab to start scanning
                                        channels.
                                    </div>
                                </div>
                            </div>
                            <Switch
                                checked={messageScanEnabled}
                                onCheckedChange={handleToggle}
                                disabled={toggleMutation.isPending}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Badge
                            variant={
                                messageScanEnabled ? "default" : "secondary"
                            }
                        >
                            {messageScanEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        {toggleMutation.isPending && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Updating...
                            </p>
                        )}
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
