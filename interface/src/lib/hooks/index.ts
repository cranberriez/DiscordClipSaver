/**
 * TanStack Query Hooks
 *
 * Centralized exports for all query hooks.
 */

// Guild hooks
export {
    useGuilds,
    useGuild,
    useToggleScanning,
    useGuildsDiscord,
    useGuildsWithClipCount,
} from "./useGuilds";

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
    useStartBulkScan,
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
