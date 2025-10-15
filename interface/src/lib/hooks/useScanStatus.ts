/**
 * React hooks for channel scan status
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChannelScanStatus, ScanStatus } from "../db/schemas/channel_scan_status.kysely";

export interface ChannelWithScanStatus {
    channelId: string;
    channelName: string;
    status: ScanStatus | null;
    messageCount: number;
    totalMessagesScanned: number;
    updatedAt: Date | null;
}

/**
 * Hook to fetch and manage scan status for a single channel
 */
export function useChannelScanStatus(guildId: string, channelId: string) {
    const [status, setStatus] = useState<ChannelScanStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/guilds/${guildId}/channels/${channelId}/scan-status`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch scan status");
            }

            const data = await response.json();
            setStatus(data.status);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [guildId, channelId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    return { status, loading, error, refetch: fetchStatus };
}

/**
 * Hook to fetch scan statuses for all channels in a guild
 * Returns all channels with their scan status (or null if never scanned)
 */
export function useGuildScanStatuses(guildId: string) {
    const [channels, setChannels] = useState<ChannelWithScanStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatuses = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/guilds/${guildId}/scan-statuses`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch scan statuses");
            }

            const data = await response.json();
            setChannels(data.channels);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [guildId]);

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    return { channels, loading, error, refetch: fetchStatuses };
}

/**
 * Hook to poll scan status at regular intervals
 */
export function usePolledScanStatus(
    guildId: string,
    channelId: string,
    intervalMs: number = 5000
) {
    const { status, loading, error, refetch } = useChannelScanStatus(
        guildId,
        channelId
    );

    useEffect(() => {
        // Only poll if status is RUNNING or PENDING
        if (status?.status === "RUNNING" || status?.status === "PENDING") {
            const interval = setInterval(refetch, intervalMs);
            return () => clearInterval(interval);
        }
    }, [status?.status, intervalMs, refetch]);

    return { status, loading, error, refetch };
}
