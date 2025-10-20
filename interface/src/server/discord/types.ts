import "server-only";

// Guild shape returned by Discord GET /users/@me/guilds ("partial guild")
// Note: This is not the full Guild object; it only includes fields exposed by this endpoint.
export type DiscordGuild = {
    id: string;
    name: string;
    icon?: string | null;
    owner?: boolean;
    owner_id?: string;
    permissions?: string; // Discord returns stringified int
    permissions_new?: string; // larger bitfield string (if present)
    features?: string[];
};

// Relation of guild to user
export type GuildRelation = "owned" | "unowned" | "invitable" | "other";
