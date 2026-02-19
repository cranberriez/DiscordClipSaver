import type { AuthorTable } from "./author.kysely";
import type { UserTable } from "./user.kysely";
import type { GuildTable } from "./guild.kysely";
import type { GuildSettingsTable } from "./guild_settings.kysely";
import type { ChannelTable } from "./channel.kysely";
import type { ChannelSettingsTable } from "./channel_settings.kysely";
import type { InstallIntentTable } from "./install_intents.kysely";
import type { ChannelScanStatusTable } from "./channel_scan_status.kysely";
import type { MessageTable } from "./message.kysely";
import type { ClipTable } from "./clip.kysely";
import type { ThumbnailTable } from "./thumbnail.kysely";
import type { FavoriteClipTable } from "./favorite_clips.kysely";
import type { ServerTagTable } from "./server_tags.kysely";
import type { ClipTagTable } from "./clip_tags.kysely";

export interface DB {
	author: AuthorTable;
	user: UserTable;
	guild: GuildTable;
	guild_settings: GuildSettingsTable;
	channel: ChannelTable;
	channel_settings: ChannelSettingsTable;
	install_intent: InstallIntentTable;
	channel_scan_status: ChannelScanStatusTable;
	message: MessageTable;
	clip: ClipTable;
	thumbnail: ThumbnailTable;
	favorite_clip: FavoriteClipTable;
	server_tags: ServerTagTable;
	clip_tags: ClipTagTable;
}
