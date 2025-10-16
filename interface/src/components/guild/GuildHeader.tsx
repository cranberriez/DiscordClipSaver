"use client";

import { useToggleScanning, useGuild } from "@/lib/hooks/queries";
import type { Guild } from "@/lib/db/types";
import {
    Card,
    CardContent,
    CardAction,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-4">
                {iconUrl && (
                    <div>
                        <img
                            src={iconUrl}
                            alt={`${guildName} icon`}
                            className="w-32 h-32 rounded-xl"
                        />
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">{guildName}</h1>
                    <p className="text-sm text-muted-foreground">
                        Guild ID: {guildId}
                    </p>
                    {ownerId === guild?.owner_id && (
                        <Badge variant="destructive">Owner</Badge>
                    )}
                </div>
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

            <GuildScanningCard
                messageScanEnabled={messageScanEnabled}
                handleToggle={handleToggle}
                toggleMutation={toggleMutation}
            />
        </div>
    );
}

function GuildScanningCard({
    messageScanEnabled,
    handleToggle,
    toggleMutation,
}: {
    messageScanEnabled: boolean;
    handleToggle: () => void;
    toggleMutation: any;
}) {
    return (
        <Card className="flex-1 md:h-32 py-4 gap-3">
            <CardHeader>
                <CardTitle className="text-lg">Message Scanning</CardTitle>
                <CardAction>
                    <ToggleGuildScanning
                        messageScanEnabled={messageScanEnabled}
                        handleToggle={handleToggle}
                        toggleMutation={toggleMutation}
                    />
                </CardAction>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                    This controls whether scans are allowed to run. Use the
                    Scans tab to configure and start scanning specific channels.
                </span>
            </CardContent>
        </Card>
    );
}

function ToggleGuildScanning({
    messageScanEnabled,
    handleToggle,
    toggleMutation,
}: {
    messageScanEnabled: boolean;
    handleToggle: () => void;
    toggleMutation: any;
}) {
    return (
        <Button
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            variant="ghost"
            className={`relative min-w-[140px] px-4 transition-all cursor-pointer ${
                messageScanEnabled
                    ? "border border-green-400/40 bg-green-950/30 hover:bg-green-950/30! text-green-400 shadow-[0_0_12px_rgba(74,222,128,0.15)] hover:shadow-[0_0_16px_rgba(74,222,128,0.25)]"
                    : "border border-red-400/40 bg-red-950/30 hover:bg-red-950/30! text-red-400 shadow-[0_0_12px_rgba(248,113,113,0.15)] hover:shadow-[0_0_16px_rgba(248,113,113,0.25)]"
            }`}
        >
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {messageScanEnabled ? (
                    <CheckCircle2 className="h-4 w-4" />
                ) : (
                    <XCircle className="h-4 w-4" />
                )}
            </div>
            <span
                className={`font-semibold uppercase tracking-wider flex items-center ${
                    toggleMutation.isPending ? "text-xs" : ""
                }`}
            >
                {toggleMutation.isPending
                    ? "Updating..."
                    : messageScanEnabled
                    ? "Active"
                    : "Inactive"}
            </span>
        </Button>
    );
}
