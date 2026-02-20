import { DbChannel, DbChannelWithClipCount } from "../db/types";
import { Channel, ChannelWithStats } from "@/lib/api/channel";

export class ChannelMapper {
	static toChannel(dbChannel: DbChannel): Channel {
		return {
			id: dbChannel.id,
			guild_id: dbChannel.guild_id,
			name: dbChannel.name,
			type: dbChannel.type,
			position: dbChannel.position,
			parent_id: dbChannel.parent_id,
			nsfw: dbChannel.nsfw,
			message_scan_enabled: dbChannel.message_scan_enabled,
			last_channel_sync_at: dbChannel.last_channel_sync_at,
			next_allowed_channel_sync_at:
				dbChannel.next_allowed_channel_sync_at,
			channel_sync_cooldown_level: dbChannel.channel_sync_cooldown_level,
			purge_cooldown: dbChannel.purge_cooldown,
			created_at: dbChannel.created_at,
			updated_at: dbChannel.updated_at,
			deleted_at: dbChannel.deleted_at,
		};
	}

	static toChannelWithStats(
		dbChannel: DbChannelWithClipCount
	): ChannelWithStats {
		return {
			id: dbChannel.id,
			guild_id: dbChannel.guild_id,
			name: dbChannel.name,
			type: dbChannel.type,
			position: dbChannel.position,
			parent_id: dbChannel.parent_id,
			nsfw: dbChannel.nsfw,
			clip_count: dbChannel.clip_count,
			message_scan_enabled: dbChannel.message_scan_enabled,
			last_channel_sync_at: dbChannel.last_channel_sync_at,
			next_allowed_channel_sync_at:
				dbChannel.next_allowed_channel_sync_at,
			channel_sync_cooldown_level: dbChannel.channel_sync_cooldown_level,
			purge_cooldown: dbChannel.purge_cooldown,
			created_at: dbChannel.created_at,
			updated_at: dbChannel.updated_at,
			deleted_at: dbChannel.deleted_at,
		};
	}
}
