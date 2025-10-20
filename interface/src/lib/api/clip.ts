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
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface Thumbnail {
    url: string;
    size: "small" | "large";
    width: number;
    height: number;
}

export interface FullClip {
    clip: Clip;
    message: Message;
    thumbnail: Thumbnail;
}

export interface ClipList {
    clips: FullClip[];
    pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
