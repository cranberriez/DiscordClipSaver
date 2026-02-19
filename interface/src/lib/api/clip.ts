export interface Clip {
	id: string;
	message_id: string;
	guild_id: string;
	channel_id: string;
	title: string | null;
	filename: string;
	file_size: number;
	mime_type: string;
	duration: number;
	resolution: string | null;
	settings_hash: string | null;
	cdn_url: string;
	expires_at: Date;
	visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
	thumbnail_status: "pending" | "processing" | "completed" | "failed";
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

export interface Tag {
	id: string;
	guild_id: string;
	name: string;
	slug: string;
	color: string | null;
	is_active: boolean;
	created_by_user_id: string;
	created_at: Date;
}

export interface FullClip {
	clip: Clip;
	message: Message;
	thumbnail: Thumbnail[] | null;
	tags: string[]; // slugs
	isFavorited?: boolean;
	favorite_count: number;
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

export type SortOrder = "asc" | "desc";
export type SortType = "date" | "duration" | "size" | "likes";

export interface ClipListParams {
	guildId: string;
	channelIds?: string[];
	authorIds?: string[];
	limit?: number;
	offset?: number;
	sortOrder?: SortOrder;
	sortType?: SortType;
	favorites?: boolean;
}

export interface RefreshCdnResponse {
	cdn_url: string;
	expires_at: string;
}
