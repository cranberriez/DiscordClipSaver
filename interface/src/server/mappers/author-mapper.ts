import type { AuthorWithStats } from "@/lib/api/author";
import type { DbAuthorWithStats } from "../db/types";

/**
 * Maps database author query results to AuthorWithStats DTO
 */
export class AuthorMapper {
	static toAuthorWithStats(dbAuthor: DbAuthorWithStats): AuthorWithStats {
		let display_name = dbAuthor.username;
		if (dbAuthor.nickname) {
			display_name = dbAuthor.nickname;
		} else if (dbAuthor.display_name) {
			display_name = dbAuthor.display_name;
		}

		let avatar_url = dbAuthor.avatar_url;
		if (dbAuthor.guild_avatar_url) {
			avatar_url = dbAuthor.guild_avatar_url;
		}

		return {
			user_id: dbAuthor.user_id,
			display_name,
			avatar_url,
			clip_count: dbAuthor.clip_count || 0,
			channel_clip_counts: dbAuthor.channel_clip_counts || {},
		};
	}
}
