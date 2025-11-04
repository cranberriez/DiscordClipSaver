export interface Clip {
    id: string;
    message_id: string;
    guild_id: string;
    channel_id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    duration: number;
    resolution: string | null;
    settings_hash: string | null;
    cdn_url: string;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface Message {
    id: string;
    guild_id: string;
    channel_id: string;
    content: string | null;
    author_id: string;
    timestamp: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface Thumbnail {
    url: string | null;
    size: "small" | "large";
    width: number;
    height: number;
}

export interface FullClip {
    clip: Clip;
    message: Message;
    thumbnail: Thumbnail[] | null;
    isFavorited?: boolean;
}

export interface ClipListResponse {
    clips: FullClip[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}

export interface ClipListParams {
    guildId: string;
    channelId?: string; // Optional - if omitted, returns all clips for guild
    limit?: number;
    offset?: number;
}

export interface RefreshCdnResponse {
    cdn_url: string;
    expires_at: string;
}
