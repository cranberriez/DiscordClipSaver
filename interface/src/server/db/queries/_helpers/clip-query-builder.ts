// Centralized clip query builder following SOLID principles
import { getDb } from "../../db";
import type { SelectQueryBuilder } from "kysely";
import type { DB } from "../../schemas/db";
import type { DbClip, DbMessage, DbThumbnail } from "../../types";
import { onlyFavorites, getFavoriteStatusForClips } from "./favorites";

export interface ClipQueryFilters {
    guildId?: string;
    channelIds?: string[];
    authorIds?: string[];
    userId?: string;
    favoritesOnly?: boolean;
}

export interface ClipQueryOptions {
    limit?: number;
    offset?: number;
    sort?: "asc" | "desc";
    fetchMultiplier?: number; // For handling deleted message filtering
}

export interface ClipWithMetadata {
    clip: DbClip;
    message: DbMessage;
    thumbnails: DbThumbnail[];
    isFavorited?: boolean;
}

/**
 * Single Responsibility: Build the base clip query with all filters
 */
class ClipQueryBuilder {
    private query: SelectQueryBuilder<DB, "clip" | "message", DbClip>;

    constructor() {
        this.query = getDb()
            .selectFrom("clip")
            .innerJoin("message", "message.id", "clip.message_id")
            .selectAll("clip")
            .where("clip.deleted_at", "is", null)
            .where("message.deleted_at", "is", null);
    }

    /**
     * Apply all filters in a chainable way
     */
    withFilters(filters: ClipQueryFilters): this {
        if (filters.guildId) {
            this.query = this.query.where("clip.guild_id", "=", filters.guildId);
        }

        if (filters.channelIds && filters.channelIds.length > 0) {
            this.query = this.query.where("clip.channel_id", "in", filters.channelIds);
        }

        if (filters.authorIds && filters.authorIds.length > 0) {
            this.query = this.query.where("message.author_id", "in", filters.authorIds);
        }

        if (filters.favoritesOnly && filters.userId) {
            this.query = onlyFavorites(this.query, filters.userId);
        }

        return this;
    }

    /**
     * Apply pagination and sorting
     */
    withPagination(options: ClipQueryOptions): this {
        const { limit = 50, offset = 0, sort = "desc", fetchMultiplier = 2 } = options;
        const fetchLimit = Math.min(limit * fetchMultiplier, 200);

        this.query = this.query
            .orderBy("message.timestamp", sort)
            .limit(fetchLimit)
            .offset(offset);

        return this;
    }

    /**
     * Execute the query
     */
    async execute(): Promise<DbClip[]> {
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
        favoritesMap: Map<string, boolean>;
    }> {
        if (clipIds.length === 0) {
            return {
                messages: [],
                thumbnails: [],
                favoritesMap: new Map(),
            };
        }

        const [messages, thumbnails, favoritesMap] = await Promise.all([
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
            // Favorites (conditional)
            userId 
                ? getFavoriteStatusForClips(clipIds, userId)
                : Promise.resolve(new Map<string, boolean>()),
        ]);

        return { messages, thumbnails, favoritesMap };
    }
}

/**
 * Single Responsibility: Combine clips with their related data
 */
class ClipDataCombiner {
    static combine(
        clips: DbClip[],
        messages: DbMessage[],
        thumbnails: DbThumbnail[],
        favoritesMap: Map<string, boolean>,
        requestedLimit: number
    ): ClipWithMetadata[] {
        // Create lookup maps
        const messageMap = new Map(messages.map(m => [m.id, m]));
        const thumbnailMap = new Map<string, DbThumbnail[]>();
        
        for (const thumb of thumbnails) {
            if (!thumbnailMap.has(thumb.clip_id)) {
                thumbnailMap.set(thumb.clip_id, []);
            }
            thumbnailMap.get(thumb.clip_id)!.push(thumb);
        }

        // Combine data - filter out clips without valid messages
        const validClips = clips
            .filter(clip => messageMap.has(clip.message_id))
            .map(clip => ({
                clip: clip,
                message: messageMap.get(clip.message_id)!,
                thumbnails: thumbnailMap.get(clip.id) || [],
                isFavorited: favoritesMap.get(clip.id) || false,
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
        const clipIds = clips.map(c => c.id);
        const messageIds = clips.map(c => c.message_id);

        // 3. Fetch all related data in parallel
        const { messages, thumbnails, favoritesMap } = await RelatedDataFetcher.fetchAll(
            clipIds,
            messageIds,
            filters.userId
        );

        // 4. Combine everything
        return ClipDataCombiner.combine(
            clips,
            messages,
            thumbnails,
            favoritesMap,
            limit
        );
    }
}
