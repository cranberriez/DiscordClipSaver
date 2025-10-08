import "server-only";

// Guild shape returned by Discord GET /users/@me/guilds ("partial guild")
// Note: This is not the full Guild object; it only includes fields exposed by this endpoint.
export type Guild = {
	id: string;
	name: string;
	icon?: string | null;
	owner?: boolean;
	permissions?: string | number; // Discord returns stringified int
	permissions_new?: string; // larger bitfield string (if present)
	features?: string[];
};

// Back-compat alias, since many places in the app referenced PartialGuild
export type PartialGuild = Guild;

export type DBGuild = {
	guild_id: string;
	name: string;
	owner_user_id: string | null; // bigint from PG comes back as string
	joined_at: string | null; // treat dates as ISO strings at the edge
	last_seen_at: string | null;
};

// Enriched UI shape that combines the Discord guild with optional DB data
export type GuildItem = Guild & {
	db?: DBGuild; // present if the bot is installed/known in DB
};

// Relation of guild to user
export type GuildRelation = "owned" | "unowned" | "invitable" | "other";
