import { z } from "zod";

// Database row as returned by node-postgres for bot_guilds
// bigint columns (owner_user_id) come back as strings
export const BotGuildRowSchema = z.object({
	guild_id: z.string(),
	name: z.string(),
	owner_user_id: z.string().nullable(),
	joined_at: z.coerce.date().nullable(),
	last_seen_at: z.coerce.date().nullable(),
});
export type BotGuildRow = z.infer<typeof BotGuildRowSchema>;

// Create/insert payload for bot_guilds
export const CreateBotGuildSchema = z.object({
	guild_id: z.string(),
	name: z.string(),
	owner_user_id: z.string().nullable().optional(),
	joined_at: z.coerce.date().nullable().optional(),
	last_seen_at: z.coerce.date().nullable().optional(),
});
export type CreateBotGuild = z.infer<typeof CreateBotGuildSchema>;
