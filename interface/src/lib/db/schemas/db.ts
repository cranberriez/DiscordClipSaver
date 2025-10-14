import type { UserTable } from "./user.kysely";
import type { GuildTable } from "./guild.kysely";
import type { GuildSettingsTable } from "./guild_settings.kysely";
import type { ChannelTable } from "./channel.kysely";
import type { ChannelSettingsTable } from "./channel_settings.kysely";
import type { InstallIntentTable } from "./install_intents.kysely";

export interface DB {
    user: UserTable;
    guild: GuildTable;
    guild_settings: GuildSettingsTable;
    channel: ChannelTable;
    channel_settings: ChannelSettingsTable;
    install_intent: InstallIntentTable;
}
