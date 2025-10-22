export { getUserByDiscordId, upsertUser, updateUser } from "./queries/users";
export { db, getDb } from "./db";
export {
    consumeInstallIntent,
    createInstallIntent,
} from "./queries/install_intents";
export {
    getGuildsByIds,
    getGuildsByIdsWithClipCount,
    getSingleGuildById,
    setGuildOwnerIfUnclaimed,
    updateGuildMessageScanEnabled,
} from "./queries/guilds";
export type { GuildWithClipCount } from "./queries/guilds";
export {
    getGuildSettings,
    upsertGuildSettings,
    deleteGuildSettings,
} from "./queries/guild_settings";
export {
    getChannelsByGuildId,
    bulkUpdateChannelsEnabled,
    getChannelById,
    getChannelsByGuildIdWithClipCount,
} from "./queries/channels";
export {
    getClipById,
    getClipsByGuildId,
    getClipsByChannelId,
    getClipsByChannelIds,
    getClipCountByChannelId,
    updateClipCdnUrl,
    isClipExpired,
} from "./queries/clips";
export {
    getChannelScanStatus,
    getGuildScanStatuses,
} from "./queries/scan_status";
export {
    getAuthorStatsByGuildId,
    getAuthorStatsById,
    getAuthorsByGuildId,
    getAuthorById,
} from "./queries/authors";
