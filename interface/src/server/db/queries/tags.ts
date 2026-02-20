import { getDb } from "../db";
import type { DbServerTag, DbNewServerTag, DbServerTagUpdate } from "../types";

// Server Tag Operations

export async function getServerTags(
	guildId: string,
	includeInactive: boolean = false
): Promise<DbServerTag[]> {
	let query = getDb()
		.selectFrom("server_tags")
		.selectAll()
		.where("guild_id", "=", guildId);

	if (!includeInactive) {
		query = query.where("is_active", "=", true);
	}

	return await query.orderBy("name", "asc").execute();
}

export async function getServerTagById(
	tagId: string
): Promise<DbServerTag | undefined> {
	return await getDb()
		.selectFrom("server_tags")
		.selectAll()
		.where("id", "=", tagId)
		.executeTakeFirst();
}

export async function createServerTag(
	tag: DbNewServerTag
): Promise<DbServerTag> {
	return await getDb()
		.insertInto("server_tags")
		.values(tag)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function updateServerTag(
	tagId: string,
	update: DbServerTagUpdate
): Promise<DbServerTag | undefined> {
	return await getDb()
		.updateTable("server_tags")
		.set(update)
		.where("id", "=", tagId)
		.returningAll()
		.executeTakeFirst();
}

export async function deleteServerTag(tagId: string): Promise<boolean> {
	// Hard delete the tag
	// NOTE: We assume CASCADE is set up in the database for clip_tags.
	// If not, we should manually delete from clip_tags first.
	// Given the user request "cascade that", we'll attempt to delete.
	// Kysely/Postgres will handle cascade if configured, otherwise it might throw foreign key violation.
	// To be safe and ensure "cascade" behavior even if DB constraint isn't CASCADE,
	// we can manually delete from clip_tags first.

	await getDb().deleteFrom("clip_tags").where("tag_id", "=", tagId).execute();

	const result = await getDb()
		.deleteFrom("server_tags")
		.where("id", "=", tagId)
		.executeTakeFirst();

	return result.numDeletedRows > 0;
}

// Clip Tag Operations

export async function addTagToClip(
	guildId: string,
	clipId: string,
	tagId: string,
	userId: string
): Promise<void> {
	await getDb()
		.insertInto("clip_tags")
		.values({
			guild_id: guildId,
			clip_id: clipId,
			tag_id: tagId,
			applied_by_user_id: userId,
			applied_at: new Date(),
		})
		.onConflict((oc) =>
			oc.columns(["guild_id", "clip_id", "tag_id"]).doNothing()
		)
		.execute();
}

export async function removeTagFromClip(
	guildId: string,
	clipId: string,
	tagId: string
): Promise<void> {
	await getDb()
		.deleteFrom("clip_tags")
		.where("guild_id", "=", guildId)
		.where("clip_id", "=", clipId)
		.where("tag_id", "=", tagId)
		.execute();
}

export async function getTagsForClips(
	clipIds: string[]
): Promise<Map<string, string[]>> {
	if (clipIds.length === 0) {
		return new Map();
	}

	const rows = await getDb()
		.selectFrom("clip_tags")
		.innerJoin("server_tags", "server_tags.id", "clip_tags.tag_id")
		.select(["clip_tags.clip_id", "server_tags.slug"])
		.where("clip_tags.clip_id", "in", clipIds)
		.where("server_tags.is_active", "=", true)
		.execute();

	const result = new Map<string, string[]>();

	for (const row of rows) {
		if (!result.has(row.clip_id)) {
			result.set(row.clip_id, []);
		}

		result.get(row.clip_id)!.push(row.slug);
	}

	return result;
}
