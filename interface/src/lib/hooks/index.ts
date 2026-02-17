/**
 * TanStack Query Hooks
 *
 * Centralized exports for all query hooks.
 */

// Guild hooks
export {
    useGuilds,
    useGuild,
    useGuildStats,
    useToggleScanning,
    useGuildsDiscord,
    useGuildsWithClipCount,
} from "./useGuilds";

// Channel hooks
export * from "./useDebounce";
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
    useStartBulkScan,
    useStartCustomScan,
} from "./useScans";

// Settings hooks
export {
    useGuildSettings,
    useUpdateGuildSettings,
    useGuildSettingsForm,
} from "./useSettings";

// Clip hooks
export {
    useChannelClips,
    useChannelClipsInfinite,
    useClip,
    clipKeys,
    // Deprecated - use useChannelClips instead
    useClips,
    useClipsInfinite,
} from "./useClips";

// Author hooks
export {
    useAuthorStats,
    usePrefetchAuthorStats,
    authorKeys,
} from "./useAuthors";

// User hooks
export { useUser, useIsSystemAdmin, userKeys } from "./useUser";
