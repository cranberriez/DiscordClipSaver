import { getDb } from "../db";
import type { DbUser, DbNewUser, DbUserUpdate } from "../types";

export async function upsertUser(params: DbNewUser): Promise<DbUser> {
	if (!params.id) throw new Error("User ID is required");
	if (!params.username) throw new Error("Username is required");
	if (!params.discriminator) throw new Error("Discriminator is required");

	const now = new Date();

	const newUser: DbNewUser = {
		id: params.id,
		username: params.username,
		discriminator: params.discriminator,
		avatar_url: params.avatar_url ?? null,
		roles: params.roles,
		created_at: now,
		updated_at: now,
	};

	return getDb()
		.insertInto("user")
		.values(newUser)
		.onConflict((oc) =>
			oc.column("id").doUpdateSet({
				username: newUser.username,
				discriminator: newUser.discriminator,
				avatar_url: newUser.avatar_url,
				updated_at: now,
			})
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function updateUser(params: DbUserUpdate): Promise<DbUser> {
	if (!params.id) throw new Error("User ID is required");

	return getDb()
		.updateTable("user")
		.set(params)
		.where("id", "=", params.id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function getUserByDiscordId(
	discordUserId: string
): Promise<DbUser | null> {
	const row = await getDb()
		.selectFrom("user")
		.selectAll()
		.where("id", "=", discordUserId)
		.executeTakeFirst();

	if (!row) return null;
	return row;
}

/**
 * @deprecated Use `getAuthorStatsByGuildId` from `queries/authors` instead.
 * Get all authors with clip statistics for a specific guild
 * Returns authors with total clip count and per-channel breakdown
 */
export async function getAuthorStatsByGuildId(guildId: string) {
	const db = getDb();

	const results = await db
		.selectFrom("user as u")
		.innerJoin("message as m", "u.id", "m.author_id")
		.innerJoin("clip as c", "m.id", "c.message_id")
		.select([
			"u.id",
			"u.username",
			"u.avatar_url",
			db.fn.countAll<number>().as("clip_count"),
		])
		.where("m.guild_id", "=", guildId)
		.where("m.deleted_at", "is", null)
		.groupBy(["u.id", "u.username", "u.avatar_url"])
		.orderBy("clip_count", "desc")
		.execute();

	// For each author, get per-channel clip counts
	const authorsWithChannelCounts = await Promise.all(
		results.map(async (author) => {
			const channelCounts = await db
				.selectFrom("message as m")
				.innerJoin("clip as c", "m.id", "c.message_id")
				.select(["m.channel_id", db.fn.countAll<number>().as("count")])
				.where("m.author_id", "=", author.id)
				.where("m.guild_id", "=", guildId)
				.where("m.deleted_at", "is", null)
				.groupBy("m.channel_id")
				.execute();

			const channel_clip_counts: Record<string, number> = {};
			channelCounts.forEach((row) => {
				channel_clip_counts[row.channel_id] = Number(row.count);
			});

			return {
				...author,
				clip_count: Number(author.clip_count),
				channel_clip_counts,
			};
		})
	);

	return authorsWithChannelCounts;
}
