import type { UsersTable } from "./users.kysely";
import type { GuildsTable } from "./guilds.kysely";
import type { GuildSettingsTable } from "./guild_settings.kysely";
import type { ChannelsTable } from "./channels.kysely";
import type { ChannelSettingsTable } from "./channel_settings.kysely";
import type { InstallIntentsTable } from "./install_intents.kysely";

export interface DB {
  users: UsersTable;
  guilds: GuildsTable;
  guild_settings: GuildSettingsTable;
  channels: ChannelsTable;
  channel_settings: ChannelSettingsTable;
  install_intents: InstallIntentsTable;
}
