"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PurgeButton } from "@/components/purge/PurgeButton";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useChannelStats } from "@/lib/hooks/queries";
import { guildKeys } from "@/lib/hooks/queries/useGuilds";

interface DangerZoneProps {
    guildId: string;
    guildName: string;
}

/**
 * Danger Zone section for guild settings
 *
 * Provides destructive operations:
 * - Purge specific channels
 * - Purge all channels (without leaving guild)
 * - Purge guild (delete everything and leave)
 *
 * Uses TanStack Query to fetch channel stats (reusable across app)
 */
export function DangerZone({ guildId, guildName }: DangerZoneProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedChannelId, setSelectedChannelId] = useState<string>("");
    const [isPurgingChannel, setIsPurgingChannel] = useState(false);
    const [isPurgingAllChannels, setIsPurgingAllChannels] = useState(false);
    const [isPurgingGuild, setIsPurgingGuild] = useState(false);

    // Fetch channels with clip counts using TanStack Query
    const { data: channels = [], isLoading, error } = useChannelStats(guildId);

    const handlePurgeChannel = async () => {
        if (!selectedChannelId) {
            throw new Error("Please select a channel");
        }

        setIsPurgingChannel(true);
        try {
            const response = await fetch(
                `/api/guilds/${guildId}/channels/${selectedChannelId}/purge`,
                { method: "POST" }
            );

            if (!response.ok) {
                const error = await response.json();
                if (response.status === 429) {
                    const cooldownDate = new Date(error.cooldown_until);
                    const remainingMs = cooldownDate.getTime() - Date.now();
                    const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);
                    const remainingHours = Math.floor(remainingMinutes / 60);
                    
                    let timeMessage;
                    if (remainingMinutes < 60) {
                        timeMessage = `${remainingMinutes} minute(s)`;
                    } else {
                        const mins = remainingMinutes % 60;
                        timeMessage = `${remainingHours} hour(s)${mins > 0 ? ` and ${mins} minute(s)` : ''}`;
                    }
                    
                    throw new Error(`Channel is on cooldown. Try again in ${timeMessage}.`);
                }
                throw new Error(error.error || "Failed to purge channel");
            }

            // Invalidate channel stats cache to refetch updated counts
            await queryClient.invalidateQueries({
                queryKey: guildKeys.channelStats(guildId),
            });
            router.refresh();
        } catch (error: any) {
            console.error("Failed to purge channel:", error);
            throw error;
        } finally {
            setIsPurgingChannel(false);
        }
    };

    const handlePurgeAllChannels = async () => {
        setIsPurgingAllChannels(true);
        try {
            // Queue purge job for each channel
            const results = await Promise.allSettled(
                channels.map(async (channel) => {
                    const response = await fetch(
                        `/api/guilds/${guildId}/channels/${channel.id}/purge`,
                        { method: "POST" }
                    );
                    
                    if (!response.ok) {
                        const error = await response.json();
                        // Skip channels on cooldown (429) but continue with others
                        if (response.status === 429) {
                            return { skipped: true, channel: channel.name, error: error.error };
                        }
                        throw new Error(error.error || "Failed to purge channel");
                    }
                    
                    return { success: true, channel: channel.name };
                })
            );

            // Collect results
            const succeeded = results.filter(r => r.status === "fulfilled" && r.value.success).length;
            const skipped = results.filter(r => r.status === "fulfilled" && r.value.skipped).length;
            const failed = results.filter(r => r.status === "rejected").length;

            // Show summary message
            let message = `Purged ${succeeded} channel(s)`;
            if (skipped > 0) message += `, skipped ${skipped} on cooldown`;
            if (failed > 0) message += `, ${failed} failed`;
            
            if (failed > 0 && succeeded === 0) {
                throw new Error(`Failed to purge any channels`);
            }

            console.log(message);

            // Invalidate channel stats cache to refetch updated counts
            await queryClient.invalidateQueries({
                queryKey: guildKeys.channelStats(guildId),
            });
            router.refresh();
        } catch (error: any) {
            console.error("Failed to purge all channels:", error);
            throw error;
        } finally {
            setIsPurgingAllChannels(false);
        }
    };

    const handlePurgeGuild = async () => {
        setIsPurgingGuild(true);
        try {
            const response = await fetch(`/api/guilds/${guildId}/purge`, {
                method: "POST",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to purge guild");
            }

            // Redirect to guild list after successful purge
            router.push("/dashboard");
            router.refresh();
        } catch (error: any) {
            console.error("Failed to purge guild:", error);
            throw error;
        } finally {
            setIsPurgingGuild(false);
        }
    };

    const selectedChannel = channels.find(c => c.id === selectedChannelId);
    const totalClips = channels.reduce(
        (sum, c) => sum + (c.clip_count || 0),
        0
    );

    return (
        <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <CardTitle className="text-destructive">
                        Danger Zone
                    </CardTitle>
                </div>
                <CardDescription>
                    Destructive operations that cannot be undone
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                            Loading channel stats...
                        </span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm text-destructive">
                            Failed to load channels. Some features may be
                            unavailable.
                        </p>
                    </div>
                )}

                {/* Content - show even if loading (will be disabled) */}
                {/* Purge Specific Channel */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-sm">
                            Purge Specific Channel
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Delete all clips, messages, and thumbnails for a
                            specific channel. The channel itself will not be
                            deleted.
                        </p>
                        {channels.length > 0 ? (
                            <select
                                value={selectedChannelId}
                                onChange={e =>
                                    setSelectedChannelId(e.target.value)
                                }
                                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                            >
                                <option value="">Select a channel...</option>
                                {channels.map(channel => (
                                    <option key={channel.id} value={channel.id}>
                                        #{channel.name}
                                        {channel.clip_count !== undefined
                                            ? ` (${channel.clip_count} clips)`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                No channels available
                            </p>
                        )}
                    </div>
                    {selectedChannel ? (
                        <PurgeButton
                            label="Purge Channel"
                            title="Purge Channel"
                            description={`This will permanently delete all clips, messages, and thumbnails for "#${selectedChannel.name}". The channel itself will not be deleted.`}
                            confirmText={`DELETE ${selectedChannel.name.toUpperCase()}`}
                            onConfirm={handlePurgeChannel}
                            stats={
                                selectedChannel.clip_count
                                    ? `This will delete ${selectedChannel.clip_count} clip(s)`
                                    : "No clips to delete"
                            }
                            variant="destructive"
                            size="sm"
                        />
                    ) : (
                        <div className="flex items-center text-sm text-muted-foreground italic">
                            Select a channel first
                        </div>
                    )}
                </div>

                <Separator />

                {/* Purge All Channels */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-sm">
                            Purge All Channels
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Delete all clips, messages, and thumbnails from
                            every channel. The bot will NOT leave the guild.
                            Channels themselves will not be deleted.
                        </p>
                    </div>
                    <PurgeButton
                        label="Purge All"
                        title="Purge All Channels"
                        description={`This will permanently delete all clips, messages, and thumbnails from all ${channels.length} channel(s) in "${guildName}". The bot will remain in the guild.`}
                        confirmText="DELETE ALL CHANNELS"
                        onConfirm={handlePurgeAllChannels}
                        stats={`This will delete approximately ${totalClips} clip(s) from ${channels.length} channel(s)`}
                        variant="destructive"
                        size="sm"
                    />
                </div>

                <Separator />

                {/* Purge Guild */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-sm">
                            Purge Guild and Leave
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Delete ALL data (clips, messages, thumbnails,
                            settings) and make the bot leave this guild
                            permanently. This is the most destructive action.
                        </p>
                    </div>
                    <PurgeButton
                        label="Purge Guild"
                        title="Purge Guild and Leave"
                        description={`This will permanently delete ALL data for "${guildName}" and remove the bot from the guild. This action cannot be undone.`}
                        confirmText="DELETE GUILD"
                        onConfirm={handlePurgeGuild}
                        stats={`This will delete all ${totalClips} clips, all messages, all thumbnails, all settings, and the bot will leave the guild.`}
                        variant="destructive"
                        size="sm"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
