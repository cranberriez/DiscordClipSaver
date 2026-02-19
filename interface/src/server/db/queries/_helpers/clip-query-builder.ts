// Centralized clip query builder following SOLID principles
import { getDb } from "../../db";
import { type SelectQueryBuilder, sql } from "kysely";
import type { DB } from "../../schemas/db";
import type { DbClip, DbMessage, DbThumbnail } from "../../types";
import { onlyFavorites, getFavoriteStatusForClips } from "./favorites";
import { getTagsForClips } from "../tags";

export interface ClipQueryFilters {
	guildId?: string;
	channelIds?: string[];
	authorIds?: string[];
	userId?: string;
	favoritesOnly?: boolean;
	isGuildOwner?: boolean;
	tagsAny?: string[];
	tagsAll?: string[];
	tagsExclude?: string[];
}

export interface ClipQueryOptions {
	limit?: number;
	offset?: number;
	sortOrder?: "asc" | "desc";
	sortType?: "date" | "duration" | "size" | "likes";
	fetchMultiplier?: number; // For handling deleted message filtering
}

export interface ClipWithMetadata {
	clip: DbClip;
	message: DbMessage;
	thumbnails: DbThumbnail[];
	tags: string[];
	isFavorited?: boolean;
	favorite_count: number;
}

/**
 * Single Responsibility: Build the base clip query with all filters
 */
class ClipQueryBuilder {
	private query: SelectQueryBuilder<
		DB,
		"clip" | "message",
		DbClip & { favorite_count: number | null }
	>;

	constructor() {
		this.query = getDb()
			.selectFrom("clip")
			.innerJoin("message", "message.id", "clip.message_id")
			.selectAll("clip")
			.select((eb) => [
				eb
					.selectFrom("favorite_clip")
					.whereRef("favorite_clip.clip_id", "=", "clip.id")
					.select(eb.fn.count<number>("id").as("count"))
					.as("favorite_count"),
			])
			.where("message.deleted_at", "is", null);
	}

	/**
	 * Apply all filters in a chainable way
	 */
	withFilters(filters: ClipQueryFilters): this {
		// Filter soft-deleted clips unless user is guild owner
		if (!filters.isGuildOwner) {
			this.query = this.query.where("clip.deleted_at", "is", null);

			// Visibility filter: Public or Author's own clips
			this.query = this.query.where((eb) => {
				const conditions = [eb("clip.visibility", "=", "PUBLIC")];

				if (filters.userId) {
					conditions.push(
						eb("message.author_id", "=", filters.userId)
					);
				}

				return eb.or(conditions);
			});
		}

		if (filters.guildId) {
			this.query = this.query.where(
				"clip.guild_id",
				"=",
				filters.guildId
			);
		}

		if (filters.channelIds && filters.channelIds.length > 0) {
			this.query = this.query.where(
				"clip.channel_id",
				"in",
				filters.channelIds
			);
		}

		if (filters.authorIds && filters.authorIds.length > 0) {
			this.query = this.query.where(
				"message.author_id",
				"in",
				filters.authorIds
			);
		}

		if (filters.favoritesOnly && filters.userId) {
			this.query = onlyFavorites(this.query, filters.userId);
		}

		// Tag Filters
		if (filters.tagsAny && filters.tagsAny.length > 0) {
			this.query = this.query.where(({ exists, selectFrom }) =>
				exists(
					selectFrom("clip_tags")
						.innerJoin(
							"server_tags",
							"server_tags.id",
							"clip_tags.tag_id"
						)
						.select("clip_tags.id")
						.whereRef("clip_tags.clip_id", "=", "clip.id")
						.where("server_tags.slug", "in", filters.tagsAny!)
						.where("server_tags.is_active", "=", true)
				)
			);
		}

		if (filters.tagsExclude && filters.tagsExclude.length > 0) {
			this.query = this.query.where(({ not, exists, selectFrom }) =>
				not(
					exists(
						selectFrom("clip_tags")
							.innerJoin(
								"server_tags",
								"server_tags.id",
								"clip_tags.tag_id"
							)
							.select("clip_tags.id")
							.whereRef("clip_tags.clip_id", "=", "clip.id")
							.where(
								"server_tags.slug",
								"in",
								filters.tagsExclude!
							)
							.where("server_tags.is_active", "=", true)
					)
				)
			);
		}

		if (filters.tagsAll && filters.tagsAll.length > 0) {
			const requiredCount = filters.tagsAll.length;
			this.query = this.query.where((eb) =>
				eb(
					eb
						.selectFrom("clip_tags")
						.innerJoin(
							"server_tags",
							"server_tags.id",
							"clip_tags.tag_id"
						)
						.select((sub) =>
							sub.fn.count<number>("server_tags.id").as("count")
						)
						.whereRef("clip_tags.clip_id", "=", "clip.id")
						.where("server_tags.slug", "in", filters.tagsAll!)
						.where("server_tags.is_active", "=", true),
					"=",
					requiredCount
				)
			);
		}

		return this;
	}

	/**
	 * Apply pagination and sorting
	 * Updated to use raw SQL for NULLS LAST sorting
	 */
	withPagination(options: ClipQueryOptions): this {
		const {
			limit = 50,
			offset = 0,
			sortOrder = "desc",
			sortType = "date",
			fetchMultiplier = 2,
		} = options;
		const fetchLimit = Math.min(limit * fetchMultiplier, 200);

		switch (sortType) {
			case "duration":
				// Ensure nulls (failed parses) are always at the bottom
				this.query = this.query.orderBy(
					sql`clip.duration ${sql.raw(
						sortOrder === "desc"
							? "desc nulls last"
							: "asc nulls last"
					)}`
				);
				break;
			case "size":
				this.query = this.query.orderBy(
					sql`clip.file_size ${sql.raw(
						sortOrder === "desc"
							? "desc nulls last"
							: "asc nulls last"
					)}`
				);
				break;
			case "likes":
				this.query = this.query.orderBy("favorite_count", sortOrder);
				break;
			case "date":
			default:
				this.query = this.query.orderBy("message.timestamp", sortOrder);
				break;
		}

		this.query = this.query.limit(fetchLimit).offset(offset);

		return this;
	}

	/**
	 * Execute the query
	 */
	async execute(): Promise<(DbClip & { favorite_count: number | null })[]> {
		return await this.query.execute();
	}
}

/**
 * Single Responsibility: Fetch all related data in parallel
 */
class RelatedDataFetcher {
	static async fetchAll(
		clipIds: string[],
		messageIds: string[],
		userId?: string
	): Promise<{
		messages: DbMessage[];
		thumbnails: DbThumbnail[];
		tagsMap: Map<string, string[]>;
		favoritesMap: Map<string, boolean>;
	}> {
		if (clipIds.length === 0) {
			return {
				messages: [],
				thumbnails: [],
				tagsMap: new Map(),
				favoritesMap: new Map(),
			};
		}

		const [messages, thumbnails, tagsMap, favoritesMap] = await Promise.all(
			[
				// Messages
				getDb()
					.selectFrom("message")
					.selectAll()
					.where("id", "in", messageIds)
					.where("deleted_at", "is", null)
					.execute(),
				// Thumbnails
				getDb()
					.selectFrom("thumbnail")
					.selectAll()
					.where("clip_id", "in", clipIds)
					.where("deleted_at", "is", null)
					.execute(),
				// Tags
				getTagsForClips(clipIds),
				// Favorites (conditional)
				userId
					? getFavoriteStatusForClips(clipIds, userId)
					: Promise.resolve(new Map<string, boolean>()),
			]
		);

		return { messages, thumbnails, tagsMap, favoritesMap };
	}
}

/**
 * Single Responsibility: Combine clips with their related data
 */
class ClipDataCombiner {
	static combine(
		clips: (DbClip & { favorite_count: number | null })[],
		messages: DbMessage[],
		thumbnails: DbThumbnail[],
		tagsMap: Map<string, string[]>,
		favoritesMap: Map<string, boolean>,
		requestedLimit: number
	): ClipWithMetadata[] {
		// Create lookup maps
		const messageMap = new Map(messages.map((m) => [m.id, m]));
		const thumbnailMap = new Map<string, DbThumbnail[]>();

		for (const thumb of thumbnails) {
			if (!thumbnailMap.has(thumb.clip_id)) {
				thumbnailMap.set(thumb.clip_id, []);
			}
			thumbnailMap.get(thumb.clip_id)!.push(thumb);
		}

		// Combine data - filter out clips without valid messages
		const validClips = clips
			.filter((clip) => messageMap.has(clip.message_id))
			.map((clip) => ({
				clip: clip,
				message: messageMap.get(clip.message_id)!,
				thumbnails: thumbnailMap.get(clip.id) || [],
				tags: tagsMap.get(clip.id) || [],
				isFavorited: favoritesMap.get(clip.id) || false,
				favorite_count: Number(clip.favorite_count) || 0,
			}));

		// Return exactly the requested limit (API will add +1 for hasMore check)
		return validClips.slice(0, requestedLimit);
	}
}

/**
 * Main orchestrator following Open/Closed Principle
 * Can be extended without modifying existing code
 */
export class ClipQueryOrchestrator {
	static async getClips(
		filters: ClipQueryFilters,
		options: ClipQueryOptions = {}
	): Promise<ClipWithMetadata[]> {
		const { limit = 50 } = options;

		// 1. Build and execute main query
		const clips = await new ClipQueryBuilder()
			.withFilters(filters)
			.withPagination(options)
			.execute();

		if (clips.length === 0) {
			return [];
		}

		// 2. Extract IDs for related data fetching
		const clipIds = clips.map((c) => c.id);
		const messageIds = clips.map((c) => c.message_id);

		// 3. Fetch all related data in parallel
		const { messages, thumbnails, tagsMap, favoritesMap } =
			await RelatedDataFetcher.fetchAll(
				clipIds,
				messageIds,
				filters.userId
			);

		// 4. Combine everything
		return ClipDataCombiner.combine(
			clips,
			messages,
			thumbnails,
			tagsMap,
			favoritesMap,
			limit
		);
	}
}
