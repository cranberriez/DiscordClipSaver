import { z } from "zod";

export const UserRowSchema = z.object({
	id: z.number(),
	discord_user_id: z.string(),
	username: z.string().nullable(),
	global_name: z.string().nullable(),
	avatar: z.string().nullable(),
	last_login_at: z.coerce.date().nullable(),
});
export type UserRow = z.infer<typeof UserRowSchema>;

export const UpsertUserLoginSchema = z.object({
	discordUserId: z.string(),
	username: z.string().nullable().optional(),
	globalName: z.string().nullable().optional(),
	avatar: z.string().nullable().optional(),
});
export type UpsertUserLogin = z.infer<typeof UpsertUserLoginSchema>;
