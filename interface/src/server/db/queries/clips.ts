// Refactored clips queries using SOLID principles
import { getDb } from "../db";
import type { DbClip, DbMessage, DbThumbnail } from "../types";
import { ClipQueryOrchestrator } from "./_helpers/clip-query-builder";
import type {
    ClipQueryFilters,
    ClipQueryOptions,
} from "./_helpers/clip-query-builder";

// Re-export types for backwards compatibility
export type { ClipQueryFilters, ClipQueryOptions };

export interface ClipWithMetadata {
    clip: DbClip;
    message: DbMessage;
    thumbnails: DbThumbnail[];
    isFavorited?: boolean;
}

/**
 * Get clips by guild ID - DRY implementation using orchestrator
 */
export async function getClipsByGuildId(
    guildId: string,
    limit: number = 50,
    offset: number = 0,
    sort: "asc" | "desc" = "desc",
    authorIds?: string[],
    userId?: string,
    favoritesOnly?: boolean
): Promise<ClipWithMetadata[]> {
    return ClipQueryOrchestrator.getClips(
        {
            guildId,
            authorIds,
            userId,
            favoritesOnly,
        },
        {
            limit,
            offset,
            sort,
        }
    );
}

/**
 * Get clips by channel IDs - DRY implementation using orchestrator
 */
export async function getClipsByChannelIds(
    channelIds: string[],
    limit: number = 50,
    offset: number = 0,
    sort: "asc" | "desc" = "desc",
    authorIds?: string[],
    userId?: string,
    favoritesOnly?: boolean
): Promise<ClipWithMetadata[]> {
    return ClipQueryOrchestrator.getClips(
        {
            channelIds,
            authorIds,
            userId,
            favoritesOnly,
        },
        {
            limit,
            offset,
            sort,
        }
    );
}

/**
 * Get clips by single channel ID - convenience wrapper
 */
export async function getClipsByChannelId(
    channelId: string,
    limit: number = 50,
    offset: number = 0,
    sort: "asc" | "desc" = "desc",
    userId?: string,
    favoritesOnly?: boolean
): Promise<ClipWithMetadata[]> {
    return getClipsByChannelIds(
        [channelId],
        limit,
        offset,
        sort,
        undefined, // no author filter for single channel
        userId,
        favoritesOnly
    );
}

/**
 * Get user's favorite clips across all guilds they have access to
 */
export async function getFavoriteClips(
    userId: string,
    guildIds: string[], // Only guilds user has access to
    limit: number = 50,
    offset: number = 0,
    sort: "asc" | "desc" = "desc"
): Promise<ClipWithMetadata[]> {
    // Use IN clause for multiple guilds, force favorites only
    const clips = await getDb()
        .selectFrom("clip")
        .innerJoin("message", "message.id", "clip.message_id")
        .innerJoin("favorite_clip", "favorite_clip.clip_id", "clip.id")
        .selectAll("clip")
        .where("clip.guild_id", "in", guildIds)
        .where("clip.deleted_at", "is", null)
        .where("message.deleted_at", "is", null)
        .where("favorite_clip.user_id", "=", userId)
        .orderBy("favorite_clip.created_at", "desc") // Order by when favorited
        .limit(limit)
        .offset(offset)
        .execute();

    if (clips.length === 0) {
        return [];
    }

    // Fetch related data (we know all are favorited)
    const clipIds = clips.map(c => c.id);
    const messageIds = clips.map(c => c.message_id);

    const [messages, thumbnails] = await Promise.all([
        getDb()
            .selectFrom("message")
            .selectAll()
            .where("id", "in", messageIds)
            .where("deleted_at", "is", null)
            .execute(),
        getDb()
            .selectFrom("thumbnail")
            .selectAll()
            .where("clip_id", "in", clipIds)
            .where("deleted_at", "is", null)
            .execute(),
    ]);

    // Create lookup maps
    const messageMap = new Map(messages.map(m => [m.id, m]));
    const thumbnailMap = new Map<string, DbThumbnail[]>();
    for (const thumb of thumbnails) {
        if (!thumbnailMap.has(thumb.clip_id)) {
            thumbnailMap.set(thumb.clip_id, []);
        }
        thumbnailMap.get(thumb.clip_id)!.push(thumb);
    }

    // All clips are favorited by definition
    return clips
        .filter(clip => messageMap.has(clip.message_id))
        .map(clip => ({
            clip: clip,
            message: messageMap.get(clip.message_id)!,
            thumbnails: thumbnailMap.get(clip.id) || [],
            isFavorited: true,
        }));
}

/**
 * Get a single clip by ID with metadata - optimized single query
 */
export async function getClipById(
    clipId: string,
    userId?: string
): Promise<ClipWithMetadata | null> {
    // Single query with all JOINs for better performance
    const result = await getDb()
        .selectFrom("clip")
        .innerJoin("message", "message.id", "clip.message_id")
        .leftJoin("favorite_clip", join =>
            join
                .onRef("favorite_clip.clip_id", "=", "clip.id")
                .on("favorite_clip.user_id", "=", userId || "")
        )
        .selectAll("clip")
        .select([
            "message.id as message_id",
            "message.guild_id as message_guild_id",
            "message.channel_id as message_channel_id",
            "message.author_id",
            "message.content",
            "message.timestamp",
            "message.created_at as message_created_at",
            "message.updated_at as message_updated_at",
            "message.deleted_at as message_deleted_at",
        ])
        .select(eb =>
            eb
                .case()
                .when("favorite_clip.user_id", "is not", null)
                .then(true)
                .else(false)
                .end()
                .as("is_favorited")
        )
        .where("clip.id", "=", clipId)
        .where("clip.deleted_at", "is", null)
        .where("message.deleted_at", "is", null)
        .executeTakeFirst();

    if (!result) return null;

    // Fetch thumbnails separately (usually just 2 records)
    const thumbnails = await getDb()
        .selectFrom("thumbnail")
        .selectAll()
        .where("clip_id", "=", clipId)
        .where("deleted_at", "is", null)
        .execute();

    // Reconstruct message object
    const message: DbMessage = {
        id: result.message_id,
        guild_id: (result as any).message_guild_id,
        channel_id: (result as any).message_channel_id,
        author_id: result.author_id,
        content: result.content,
        timestamp: result.timestamp,
        created_at: result.message_created_at,
        updated_at: result.message_updated_at,
        deleted_at: result.message_deleted_at,
    };

    return {
        clip: {
            id: result.id,
            message_id: result.message_id,
            guild_id: result.guild_id,
            channel_id: result.channel_id,
            filename: result.filename,
            file_size: result.file_size,
            mime_type: result.mime_type,
            duration: result.duration,
            resolution: result.resolution,
            settings_hash: result.settings_hash,
            cdn_url: result.cdn_url,
            expires_at: result.expires_at,
            thumbnail_status: result.thumbnail_status,
            deleted_at: result.deleted_at,
            created_at: result.created_at,
            updated_at: result.updated_at,
        },
        message,
        thumbnails,
        isFavorited: (result as any).is_favorited || false,
    };
}

// Utility functions (unchanged)
export function isClipExpired(clip: DbClip): boolean {
    return new Date(clip.expires_at) < new Date();
}

export async function updateClipCdnUrl(
    clipId: string,
    cdnUrl: string,
    expiresAt: Date
): Promise<void> {
    await getDb()
        .updateTable("clip")
        .set({
            cdn_url: cdnUrl,
            expires_at: expiresAt,
            updated_at: new Date(),
        })
        .where("id", "=", clipId)
        .execute();
}

export async function getClipCountByChannelId(
    channelId: string
): Promise<number> {
    const result = await getDb()
        .selectFrom("clip")
        .select(eb => eb.fn.count<number>("id").as("count"))
        .where("channel_id", "=", channelId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    return result?.count || 0;
}

/**
 * Security function: Get only guild_id for permission checks
 * Prevents data leakage before authorization
 */
export async function getClipGuildId(
    clipId: string
): Promise<string | undefined> {
    const result = await getDb()
        .selectFrom("clip")
        .select("guild_id")
        .where("id", "=", clipId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    return result?.guild_id;
}
