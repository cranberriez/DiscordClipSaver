import { getDb } from "../db";
import type { DbServerTag, DbNewServerTag, DbServerTagUpdate } from "../types";

// Server Tag Operations

export async function getServerTags(guildId: string): Promise<DbServerTag[]> {
	return await getDb()
		.selectFrom("server_tags")
		.selectAll()
		.where("server_id", "=", guildId)
		.where("is_active", "=", true)
		.orderBy("name", "asc")
		.execute();
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
	// Soft delete by setting is_active to false?
	// The schema has is_active, but usually user wants to delete.
	// User request: "is_active BOOLEAN NOT NULL DEFAULT TRUE"
	// Let's assume hard delete or soft delete via is_active.
	// Given the unique constraint (server_id, slug), if we soft delete, we might block new tags with same slug.
	// The schema doesn't have deleted_at. It has is_active.

	// For now, let's implement soft delete via is_active = false
	const result = await getDb()
		.updateTable("server_tags")
		.set({ is_active: false })
		.where("id", "=", tagId)
		.executeTakeFirst();

	return result.numUpdatedRows > 0;
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
			server_id: guildId,
			clip_id: clipId,
			tag_id: tagId,
			applied_by_user_id: userId,
			applied_at: new Date(),
		})
		.onConflict((oc) =>
			oc.columns(["server_id", "clip_id", "tag_id"]).doNothing()
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
		.where("server_id", "=", guildId)
		.where("clip_id", "=", clipId)
		.where("tag_id", "=", tagId)
		.execute();
}

export async function getTagsForClips(
	clipIds: string[]
): Promise<Map<string, DbServerTag[]>> {
	if (clipIds.length === 0) {
		return new Map();
	}

	const rows = await getDb()
		.selectFrom("clip_tags")
		.innerJoin("server_tags", "server_tags.id", "clip_tags.tag_id")
		.select([
			"clip_tags.clip_id",
			"server_tags.id",
			"server_tags.server_id",
			"server_tags.name",
			"server_tags.slug",
			"server_tags.color",
			"server_tags.created_by_user_id",
			"server_tags.created_at",
			"server_tags.is_active",
		])
		.where("clip_tags.clip_id", "in", clipIds)
		.where("server_tags.is_active", "=", true)
		.execute();

	const result = new Map<string, DbServerTag[]>();

	for (const row of rows) {
		if (!result.has(row.clip_id)) {
			result.set(row.clip_id, []);
		}

		// Construct ServerTag object from row
		const tag: DbServerTag = {
			id: row.id,
			server_id: row.server_id,
			name: row.name,
			slug: row.slug,
			color: row.color,
			created_by_user_id: row.created_by_user_id,
			created_at: row.created_at,
			is_active: row.is_active,
		};

		result.get(row.clip_id)!.push(tag);
	}

	return result;
}
