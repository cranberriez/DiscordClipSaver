import "server-only";

/**
 * Channel Permission Filtering
 *
 * Filters channels based on user's Discord permissions.
 * Note: This is a simplified version. Full Discord permission checking
 * would require fetching channel-specific permissions from Discord API.
 */

import type { Channel } from "@/lib/api/channel";
import type { DiscordGuild } from "@/server/discord/types";
import { hasPermission, DiscordPermissions } from "./auth";

/**
 * Filter channels based on user's guild-level permissions.
 *
 * This is a simplified filter that uses guild-level permissions.
 * For full accuracy, you would need to:
 * 1. Fetch channel-specific permission overwrites from Discord
 * 2. Check role-based permissions
 * 3. Check user-specific permission overwrites
 *
 * Current logic:
 * - If user is guild owner or has ADMINISTRATOR: see all channels
 * - Otherwise: see all channels (you may want to implement more granular logic)
 *
 * @param channels - All channels in the guild
 * @param discordGuild - User's Discord guild object (contains permissions)
 * @returns Filtered list of channels user can access
 *
 * @example
 * ```typescript
 * const auth = await requireGuildAccess(req, guildId);
 * if (auth instanceof NextResponse) return auth;
 *
 * const allChannels = await getChannelsByGuildId(guildId);
 * const visibleChannels = filterChannelsByPermissions(allChannels, auth.discordGuild);
 * ```
 */
export function filterChannelsByPermissions(
    channels: Channel[],
    discordGuild: DiscordGuild | undefined
): Channel[] {
    // If no Discord guild data, return empty (user doesn't have access)
    if (!discordGuild) {
        return [];
    }

    // Guild owner or admin can see all channels
    if (
        discordGuild.owner ||
        hasPermission(discordGuild, DiscordPermissions.ADMINISTRATOR)
    ) {
        return channels;
    }

    // For now, return all channels if user has guild access
    // TODO: Implement more granular channel-level permission checking
    // This would require:
    // 1. Fetching channel permission overwrites from Discord API
    // 2. Checking user's roles and their permissions
    // 3. Applying permission overwrites
    return channels;
}

/**
 * Check if a user can view a specific channel.
 *
 * This is a placeholder for more granular permission checking.
 * Currently returns true if user has guild access.
 *
 * @param channelId - The channel ID to check
 * @param discordGuild - User's Discord guild object
 * @returns Whether user can view the channel
 */
export function canViewChannel(
    channelId: string,
    discordGuild: DiscordGuild | undefined
): boolean {
    if (!discordGuild) return false;

    // Guild owner or admin can view all channels
    if (
        discordGuild.owner ||
        hasPermission(discordGuild, DiscordPermissions.ADMINISTRATOR)
    ) {
        return true;
    }

    // For now, assume user can view if they have guild access
    // TODO: Implement channel-specific permission checking
    return true;
}

/**
 * Future enhancement: Fetch channel permissions from Discord API
 *
 * This would require:
 * ```typescript
 * async function getChannelPermissions(
 *   channelId: string,
 *   userId: string,
 *   accessToken: string
 * ): Promise<ChannelPermissions> {
 *   // Fetch from Discord API: GET /channels/{channel.id}
 *   // Parse permission_overwrites
 *   // Calculate effective permissions for user
 * }
 * ```
 */
