"server only";

import { DataService } from "@/server/services/data-service";
import { getDb } from "@/server/db";
import { FullClip } from "@/lib/api/clip";

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
}

export class PermissionService {
    /**
     * Checks if a user has permission to perform an action on a clip.
     *
     * @param clipId The ID of the clip
     * @param userId The Discord User ID
     * @param allowedLevels Array of permission levels that are allowed. If the user matches ANY of these, permission is granted.
     * @param options Additional options
     * @returns Result object containing success status, error details, and fetched data
     */
    static async checkClipPermission(
        clipId: string,
        userId: string,
        allowedLevels: PermissionLevel[] = [
            "clip_owner",
            "guild_owner",
            "system_admin",
        ],
        options: { includeDeleted?: boolean } = {}
    ): Promise<PermissionCheckResult> {
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
        };
    }
}
