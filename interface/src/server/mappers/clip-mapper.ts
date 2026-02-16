import {
    DbClip,
    DbMessage,
    DbThumbnail,
    DbClipWithMetadata,
} from "../db/types";
import { Clip, FullClip, Message, Thumbnail } from "@/lib/api/clip";

export class ClipMapper {
    static toClip(dbClip: DbClip): Clip {
        return {
            id: dbClip.id,
            message_id: dbClip.message_id,
            guild_id: dbClip.guild_id,
            channel_id: dbClip.channel_id,
            filename: dbClip.filename,
            file_size: Number(dbClip.file_size),
            mime_type: dbClip.mime_type,
            duration: Number(dbClip.duration),
            resolution: dbClip.resolution,
            settings_hash: dbClip.settings_hash,
            cdn_url: dbClip.cdn_url,
            expires_at: dbClip.expires_at,
            created_at: dbClip.created_at,
            updated_at: dbClip.updated_at,
            deleted_at: dbClip.deleted_at,
            visibility: dbClip.visibility,
            thumbnail_status: dbClip.thumbnail_status as
                | "pending"
                | "processing"
                | "completed"
                | "failed",
        };
    }

    static toMessage(dbMessage: DbMessage): Message {
        return {
            id: dbMessage.id,
            guild_id: dbMessage.guild_id,
            channel_id: dbMessage.channel_id,
            content: dbMessage.content,
            author_id: dbMessage.author_id,
            timestamp: dbMessage.timestamp,
            created_at: dbMessage.created_at,
            updated_at: dbMessage.updated_at,
            deleted_at: dbMessage.deleted_at,
        };
    }

    static toThumbnail(dbThumbnail: DbThumbnail): Thumbnail {
        return {
            url: dbThumbnail.storage_path || null,
            size: dbThumbnail.size_type as "small" | "large",
            width: dbThumbnail.width,
            height: dbThumbnail.height,
        };
    }

    static toClipWithMetadata(
        dbClipWithMetadata: DbClipWithMetadata
    ): FullClip {
        return {
            clip: ClipMapper.toClip(dbClipWithMetadata.clip),
            message: ClipMapper.toMessage(dbClipWithMetadata.message),
            thumbnail:
                dbClipWithMetadata.thumbnails.length > 0
                    ? dbClipWithMetadata.thumbnails.map(ClipMapper.toThumbnail)
                    : null,
            isFavorited: dbClipWithMetadata.isFavorited || false,
            favorite_count: Number(dbClipWithMetadata.favorite_count) || 0,
        };
    }
}
