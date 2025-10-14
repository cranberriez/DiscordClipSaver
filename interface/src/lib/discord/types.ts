import "server-only";
import { Guild } from "../db/types";

// Guild shape returned by Discord GET /users/@me/guilds ("partial guild")
// Note: This is not the full Guild object; it only includes fields exposed by this endpoint.
export type DiscordGuild = {
    id: string;
    name: string;
    icon?: string | null;
    owner?: boolean;
    permissions?: string | number; // Discord returns stringified int
    permissions_new?: string; // larger bitfield string (if present)
    features?: string[];
};

// Enriched UI shape that combines the Discord guild with optional DB data
export type FullGuild = {
    discord: DiscordGuild;
    db?: Guild;
};

// Relation of guild to user
export type GuildRelation = "owned" | "unowned" | "invitable" | "other";
