// Helper functions for favorite_clip queries
import { getDb } from "../../db";
import type { SelectQueryBuilder } from "kysely";
import type { DB } from "../../schemas/db";

/**
 * Add LEFT JOIN for favorites to include isFavorited in clip queries
 */
export function withFavorites<T>(
	query: SelectQueryBuilder<DB, any, T>,
	userId: string | null | undefined
) {
	if (!userId) {
		// No user context - return false for all clips
		return query.select(() => false as any).as("is_favorited");
	}

	return query
		.leftJoin("favorite_clip", (join) =>
			join
				.onRef("favorite_clip.clip_id", "=", "clip.id")
				.on("favorite_clip.user_id", "=", userId)
		)
		.select((eb) =>
			eb
				.case()
				.when("favorite_clip.user_id", "is not", null)
				.then(true)
				.else(false)
				.end()
				.as("is_favorited")
		);
}

/**
 * Add WHERE clause to filter only favorited clips
 */
export function onlyFavorites<T>(
	query: SelectQueryBuilder<DB, any, T>,
	userId: string
) {
	return query.where((eb) =>
		eb.exists(
			eb
				.selectFrom("favorite_clip")
				.select("favorite_clip.id")
				.whereRef("favorite_clip.clip_id", "=", "clip.id")
				.where("favorite_clip.user_id", "=", userId)
		)
	);
}

/**
 * Get favorite status for specific clip IDs (batch lookup)
 */
export async function getFavoriteStatusForClips(
	clipIds: string[],
	userId: string
): Promise<Map<string, boolean>> {
	if (clipIds.length === 0) return new Map();

	const favorites = await getDb()
		.selectFrom("favorite_clip")
		.select("clip_id")
		.where("clip_id", "in", clipIds)
		.where("user_id", "=", userId)
		.execute();

	const favoriteSet = new Set(favorites.map((f) => f.clip_id));
	return new Map(clipIds.map((id) => [id, favoriteSet.has(id)]));
}

/**
 * Toggle favorite status for a clip
 */
export async function toggleFavorite(
	clipId: string,
	userId: string
): Promise<boolean> {
	const existing = await getDb()
		.selectFrom("favorite_clip")
		.select("id")
		.where("clip_id", "=", clipId)
		.where("user_id", "=", userId)
		.executeTakeFirst();

	if (existing) {
		// Remove favorite
		await getDb()
			.deleteFrom("favorite_clip")
			.where("id", "=", existing.id)
			.execute();
		return false;
	} else {
		// Add favorite
		await getDb()
			.insertInto("favorite_clip")
			.values({
				clip_id: clipId,
				user_id: userId,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.execute();
		return true;
	}
}
