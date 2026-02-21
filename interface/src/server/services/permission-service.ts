"server only";

import { DataService } from "@/server/services/data-service";
import { getDb } from "@/server/db";
import { FullClip } from "@/lib/api/clip";
import type { AuthContext } from "@/server/middleware/auth";

export type PermissionLevel = "clip_owner" | "guild_owner" | "system_admin";

export interface PermissionCheckResult {
	success: boolean;
	error?: string;
	status?: number;
	clip?: FullClip;
	guild?: any;
	isClipOwner?: boolean;
	isGuildOwner?: boolean;
	isSystemAdmin?: boolean;
	isGuildMember?: boolean;
}

export class PermissionService {
	/**
	 * Checks if a user has permission to perform an action on a clip.
	 *
	 * @param clipId The ID of the clip
	 * @param auth The AuthContext from requireAuth (contains user ID and guilds)
	 * @param allowedLevels Array of permission levels that are allowed. If the user matches ANY of these, permission is granted.
	 * @param options Additional options
	 * @returns Result object containing success status, error details, and fetched data
	 */
	static async checkClipPermission(
		clipId: string,
		auth: AuthContext,
		allowedLevels: PermissionLevel[] = [
			"clip_owner",
			"guild_owner",
			"system_admin",
		],
		options: { includeDeleted?: boolean } = {}
	): Promise<PermissionCheckResult> {
		const userId = auth.discordUserId;

		// Fetch clip
		const clip = await DataService.getClipById(
			clipId,
			userId,
			options.includeDeleted
		);

		if (!clip) {
			return { success: false, error: "Clip not found", status: 404 };
		}

		// Fetch guild
		const guild = await DataService.getSingleGuildById(clip.clip.guild_id);
		if (!guild) {
			return { success: false, error: "Guild not found", status: 404 };
		}

		// Check Guild Membership
		// We verify if the user is a member of the guild using the cached userGuilds
		const isGuildMember = auth.userGuilds.some(
			(g) => g.id === clip.clip.guild_id
		);

		const isClipOwner = clip.message.author_id === userId;
		const isGuildOwner = guild.owner_id === userId;
		let isSystemAdmin = false;

		// Optimization: only check system admin if we need to and other checks failed
		if (
			allowedLevels.includes("system_admin") &&
			!isClipOwner &&
			!isGuildOwner
		) {
			const user = await getDb()
				.selectFrom("user")
				.select("roles")
				.where("id", "=", userId)
				.executeTakeFirst();

			if (user && user.roles === "admin") {
				isSystemAdmin = true;
			}
		}

		// Enforce Guild Access
		// If user is NOT a system admin, they MUST be a member of the guild (or owner, which implies membership)
		// This prevents users from modifying clips in guilds they have been kicked from.
		if (!isGuildMember && !isSystemAdmin && !isGuildOwner) {
			// Even if they are the clip owner, if they are not in the guild, they shouldn't be able to manage it
			// (unless we want to allow users to delete their own data even after leaving?
			// Usually apps restrict access to guild content if you are not a member).
			// The security audit specifically asked for this check.
			return {
				success: false,
				error: "You are not a member of this guild",
				status: 403,
			};
		}

		const hasPermission =
			(allowedLevels.includes("clip_owner") && isClipOwner) ||
			(allowedLevels.includes("guild_owner") && isGuildOwner) ||
			(allowedLevels.includes("system_admin") && isSystemAdmin);

		if (!hasPermission) {
			return { success: false, error: "Permission denied", status: 403 };
		}

		return {
			success: true,
			clip,
			guild,
			isClipOwner,
			isGuildOwner,
			isSystemAdmin,
			isGuildMember,
		};
	}
}
