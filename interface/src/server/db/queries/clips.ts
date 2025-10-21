import { getDb } from "../db";
import type { DbClip, DbMessage, DbThumbnail } from "../types";

export interface ClipWithMetadata {
    clip: DbClip;
    message: DbMessage;
    thumbnails: DbThumbnail[];
}

/**
 * Get all clips for a guild (all channels) with message and thumbnail data
 */
export async function getClipsByGuildId(
    guildId: string,
    limit: number = 50,
    offset: number = 0
): Promise<ClipWithMetadata[]> {
    // Fetch extra clips to account for potential filtering (deleted messages)
    // We fetch 2x limit to ensure we have enough after filtering
    const fetchLimit = Math.min(limit * 2, 200); // Cap at 200 to avoid excessive queries
    
    const clips = await getDb()
        .selectFrom("clip")
        .selectAll("clip")
        .where("clip.guild_id", "=", guildId)
        .where("clip.deleted_at", "is", null)
        .orderBy("clip.created_at", "desc")
        .limit(fetchLimit)
        .offset(offset)
        .execute();

    if (clips.length === 0) {
        return [];
    }

    // Fetch related messages and thumbnails
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

    // Combine data - filter out clips without valid messages, then slice to requested limit
    const validClips = clips
        .filter(clip => messageMap.has(clip.message_id))
        .map(clip => ({
            clip: clip,
            message: messageMap.get(clip.message_id)!,
            thumbnails: thumbnailMap.get(clip.id) || [],
        }));
    
    // Return exactly the requested limit (API will add +1 for hasMore check)
    return validClips.slice(0, limit);
}

/**
 * Get all clips for a specific channel with message and thumbnail data
 */
export async function getClipsByChannelId(
    channelId: string,
    limit: number = 50,
    offset: number = 0
): Promise<ClipWithMetadata[]> {
    // Fetch extra clips to account for potential filtering (deleted messages)
    // We fetch 2x limit to ensure we have enough after filtering
    const fetchLimit = Math.min(limit * 2, 200); // Cap at 200 to avoid excessive queries
    
    const clips = await getDb()
        .selectFrom("clip")
        .selectAll("clip")
        .where("clip.channel_id", "=", channelId)
        .where("clip.deleted_at", "is", null)
        .orderBy("clip.created_at", "desc")
        .limit(fetchLimit)
        .offset(offset)
        .execute();

    if (clips.length === 0) {
        return [];
    }

    // Fetch related messages and thumbnails
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

    // Combine data - filter out clips without valid messages, then slice to requested limit
    const validClips = clips
        .filter(clip => messageMap.has(clip.message_id))
        .map(clip => ({
            clip: clip,
            message: messageMap.get(clip.message_id)!,
            thumbnails: thumbnailMap.get(clip.id) || [],
        }));
    
    // Return exactly the requested limit (API will add +1 for hasMore check)
    return validClips.slice(0, limit);
}

/**
 * Get a single clip by ID with full metadata
 */
export async function getClipById(
    clipId: string
): Promise<ClipWithMetadata | null> {
    const clip = await getDb()
        .selectFrom("clip")
        .selectAll()
        .where("id", "=", clipId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    if (!clip) return null;

    const [message, thumbnails] = await Promise.all([
        getDb()
            .selectFrom("message")
            .selectAll()
            .where("id", "=", clip.message_id)
            .where("deleted_at", "is", null)
            .executeTakeFirst(),
        getDb()
            .selectFrom("thumbnail")
            .selectAll()
            .where("clip_id", "=", clipId)
            .where("deleted_at", "is", null)
            .execute(),
    ]);

    if (!message) return null;

    return {
        clip: clip,
        message: message,
        thumbnails: thumbnails,
    };
}

/**
 * Check if a clip's CDN URL has expired
 */
export function isClipExpired(clip: DbClip): boolean {
    return new Date(clip.expires_at) < new Date();
}

/**
 * Update a clip's CDN URL and expiration
 */
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

/**
 * Get clip count for a channel
 */
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
