import { DbGuildSettings } from "../db/types";
import { GuildSettingsResponse } from "@/lib/api/setting";

export class SettingsMapper {
	static toGuildSettings(dbSettings: DbGuildSettings): GuildSettingsResponse {
		return {
			guild_id: dbSettings.guild_id,
			settings: dbSettings.settings as Record<string, unknown> | null,
			default_channel_settings:
				dbSettings.default_channel_settings as Record<
					string,
					unknown
				> | null,
			created_at: dbSettings.created_at,
			updated_at: dbSettings.updated_at,
			deleted_at: dbSettings.deleted_at,
		};
	}

	// static toChannelSettings(dbSettings: DbChannelSettings): ChannelSettingsResponse {
	//     return {
	//         guild_id: dbSettings.guild_id,
	//         settings: dbSettings.settings,
	//         default_channel_settings: dbSettings.default_channel_settings,
	//     };
	// }
}
