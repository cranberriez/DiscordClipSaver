// ============================================================================
// Query Keys Factory
// ============================================================================

import { queryOptions } from "@tanstack/react-query";
import { ScanStatusesResponse, SingleScanStatusResponse } from "../api/scan";
import { getScanStatuses, getScanStatus } from "../api/scan";
import { ChannelScanStatus } from "@/lib/redis";

export const scanKeys = {
    all: ["scans"] as const,
    statuses: (guildId: string) =>
        [...scanKeys.all, "scanStatuses", guildId] as const,
    status: (guildId: string, channelId: string) =>
        [...scanKeys.all, "scanStatus", guildId, channelId] as const,
};

// ============================================================================
// Queries
// ============================================================================

export const scanStatusesQuery = (guildId: string) =>
    queryOptions<ScanStatusesResponse>({
        queryKey: scanKeys.statuses(guildId),
        queryFn: () => getScanStatuses(guildId),
        enabled: !!guildId,
        staleTime: 60_000,
    });

export const scanStatusQuery = (guildId: string, channelId: string) =>
    queryOptions<SingleScanStatusResponse>({
        queryKey: scanKeys.status(guildId, channelId),
        queryFn: () => getScanStatus(guildId, channelId),
        enabled: !!guildId && !!channelId,
        staleTime: 60_000,

        refetchInterval: query => {
            const data = query.state.data as
                | { status: ChannelScanStatus }
                | undefined;
            const status = data?.status;
            const hasRunningScans =
                status?.status === "RUNNING" || status?.status === "PENDING";
            // Poll every 5 seconds if scans are running, otherwise don't poll
            return hasRunningScans ? 5000 : false;
        },
    });
