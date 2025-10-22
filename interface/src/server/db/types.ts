// Export types for ease of use
export type { Guild as DbGuild } from "./schemas/guild.kysely";
export type {
    User as DbUser,
    NewUser as DbNewUser,
    UserUpdate as DbUserUpdate,
} from "./schemas/user.kysely";
export type {
    InstallIntent as DbInstallIntent,
    NewInstallIntent as DbNewInstallIntent,
    InstallIntentUpdate as DbInstallIntentUpdate,
    InstallIntentPartial as DbInstallIntentPartial,
} from "./schemas/install_intents.kysely";
export type {
    ChannelSettings as DbChannelSettings,
    NewChannelSettings as DbNewChannelSettings,
    ChannelSettingsUpdate as DbChannelSettingsUpdate,
} from "./schemas/channel_settings.kysely";
export type {
    GuildSettings as DbGuildSettings,
    NewGuildSettings as DbNewGuildSettings,
    GuildSettingsUpdate as DbGuildSettingsUpdate,
} from "./schemas/guild_settings.kysely";
export type {
    Channel as DbChannel,
    ChannelWithClipCount as DbChannelWithClipCount,
    ChannelType as DbChannelType,
} from "./schemas/channel.kysely";
export type {
    ScanStatus as DbScanStatus,
    NewChannelScanStatus as DbNewChannelScanStatus,
    ChannelScanStatus as DbChannelScanStatus,
    ChannelScanStatusUpdate as DbChannelScanStatusUpdate,
} from "./schemas/channel_scan_status.kysely";
export type {
    SelectableAuthor as DbAuthor,
    NewAuthor as DbNewAuthor,
    AuthorUpdate as DbAuthorUpdate,
} from "./schemas/author.kysely";
export type { Message as DbMessage } from "./schemas/message.kysely";
export type { Clip as DbClip } from "./schemas/clip.kysely";
export type { ClipWithMetadata as DbClipWithMetadata } from "./queries/clips";
export type { Thumbnail as DbThumbnail } from "./schemas/thumbnail.kysely";
