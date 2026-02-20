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

export type DiscordUser = {
	id: string;
	username: string;
	global_name: string | null;
	discriminator: string | null;
	avatar: string;
	verified: boolean;
	email: string | null;
	flags: number;
	banner: string | null;
	accent_color: number | null;
	premium_type: PremiumType;
	public_flags: number;
	avatar_decoration_data: {
		sku_id: string;
		asset: string;
	};
	collectibles: {
		nameplate: {
			sku_id: string;
			asset: string;
			label: string;
			palette: string;
		};
	};
	primary_guild: {
		identity_guild_id: string;
		identity_enabled: boolean;
		tag: string;
		badge: string;
	};
};

export enum PremiumType {
	NONE = 0,
	NITRO_CLASSIC = 1,
	NITRO = 2,
	NITRO_BASIC = 3,
}
