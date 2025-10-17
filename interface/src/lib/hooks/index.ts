/**
 * TanStack Query Hooks
 *
 * Centralized exports for all query hooks.
 */

// Guild hooks
export { useGuilds, useGuild, useToggleScanning } from "./useGuilds";

// Channel hooks
export {
    useChannels,
    useChannelStats,
    useTotalClipCount,
    useBulkUpdateChannels,
} from "./useChannels";

// Scan hooks
export {
    useScanStatuses,
    useChannelScanStatus,
    useStartScan,
} from "./useScans";

// Settings hooks
export {
    useGuildSettings,
    useUpdateGuildSettings,
    useGuildSettingsWithBuilder,
} from "./useSettings";
export type { UseGuildSettingsReturn } from "./useSettings";
