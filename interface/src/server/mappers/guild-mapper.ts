import { DbGuild } from "../db/types";
import { Guild, DiscordGuild } from "@/lib/api/guild";
import { DiscordGuild as DiscordGuildModel } from "../discord/types";

// Maps DBGuild to Guild for use by the Serverside API
export class GuildMapper {
    static toGuild(dbGuild: DbGuild): Guild {
        return {
            id: dbGuild.id,
            name: dbGuild.name,
            icon_url: dbGuild.icon_url,
            owner_id: dbGuild.owner_id,
            message_scan_enabled: dbGuild.message_scan_enabled,
            last_message_scan_at: dbGuild.last_message_scan_at,
            created_at: dbGuild.created_at,
            updated_at: dbGuild.updated_at,
            deleted_at: dbGuild.deleted_at,
        };
    }

    static toDiscordGuild(discordGuild: DiscordGuildModel): DiscordGuild {
        return {
            id: discordGuild.id,
            name: discordGuild.name,
            icon: discordGuild.icon || "",
            owner: discordGuild.owner || false,
            owner_id: discordGuild.owner_id || "",
            permissions: discordGuild.permissions || "0",
            features: discordGuild.features || [],
        };
    }
}
