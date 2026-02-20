import "server-only";

/**
 * Authorization Middleware
 *
 * Provides utilities for checking user permissions in API routes.
 * Uses cached Discord guild data to avoid rate limiting.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthInfo, type AuthInfo } from "@/server/auth";
import { cacheUserScopedGraceful } from "@/server/cache";
import { discordFetch, DiscordAPIError } from "@/server/discord/discordClient";
import { getSingleGuildById } from "@/server/db";
import type { DiscordGuild } from "@/server/discord/types";
import type { DbGuild } from "@/server/db/types";

// ============================================================================
// Types
// ============================================================================

export interface AuthContext extends AuthInfo {
	userGuilds: DiscordGuild[];
}

export interface GuildAuthContext extends AuthContext {
	guild: DbGuild;
	discordGuild: DiscordGuild | undefined;
	isOwner: boolean;
	hasAccess: boolean;
}

// ============================================================================
// Core Auth Middleware
// ============================================================================

/**
 * Require authentication and fetch user's Discord guilds (cached).
 *
 * This is the base middleware that all protected routes should use.
 * Uses aggressive caching with graceful degradation:
 * - Fresh cache for 1 hour (guild membership is relatively static)
 * - Stale cache for 24 hours (served when rate limited or API unavailable)
 *
 * This prevents Discord rate limiting while ensuring reasonable freshness.
 *
 * @example
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth; // Error response
 *
 *   // auth.discordUserId, auth.accessToken, auth.userGuilds available
 * }
 * ```
 */
export async function requireAuth(
	req: NextRequest
): Promise<AuthContext | NextResponse> {
	// Check authentication
	let authInfo: AuthInfo;
	try {
		authInfo = await getAuthInfo(req);
	} catch (error) {
		console.error("[requireAuth] getAuthInfo failed:", error);
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { discordUserId, accessToken } = authInfo;
	if (!accessToken) {
		console.error(
			"[requireAuth] Missing accessToken for user:",
			discordUserId
		);
		return NextResponse.json(
			{ error: "Missing Discord token" },
			{ status: 401 }
		);
	}

	// Fetch user's guilds with graceful degradation
	// Guild membership is relatively static, so cache aggressively:
	// - Fresh for 1 hour (normal operations)
	// - Stale for 24 hours (serve when rate limited)
	const freshTtlMs = 60 * 60 * 1000; // 1 hour
	const staleTtlMs = 24 * 60 * 60 * 1000; // 24 hours

	let userGuilds: DiscordGuild[];
	try {
		userGuilds = await cacheUserScopedGraceful<DiscordGuild[]>(
			discordUserId,
			"discord:guilds",
			freshTtlMs,
			staleTtlMs,
			() => discordFetch<DiscordGuild[]>("/users/@me/guilds", accessToken)
		);
	} catch (err: any) {
		// Graceful cache should have handled rate limits by returning stale data
		// If we still get an error, it means no cache is available at all
		console.error("Failed to fetch user guilds (no cache available):", err);

		// Provide more helpful error message based on error type
		if (err instanceof DiscordAPIError) {
			if (err.status === 429) {
				return NextResponse.json(
					{
						error: "Discord rate limit exceeded after retries. Please try again in a moment.",
						retryAfter: err.retryAfter,
					},
					{ status: 429 }
				);
			}

			if (err.status === 401 || err.status === 403) {
				return NextResponse.json(
					{
						error: "Discord authorization failed. Please sign in again.",
					},
					{ status: 401 }
				);
			}
		}

		return NextResponse.json(
			{ error: "Failed to fetch Discord guilds" },
			{ status: 502 }
		);
	}

	return {
		...authInfo,
		userGuilds,
	};
}

// ============================================================================
// Guild-Specific Auth Middleware
// ============================================================================

/**
 * Require authentication and verify user has access to a specific guild.
 *
 * This checks:
 * 1. User is authenticated
 * 2. Guild exists in database
 * 3. User has access to the guild on Discord
 *
 * @param req - The request object
 * @param guildId - The guild ID to check access for
 * @param requireOwner - If true, user must be the guild owner in DB
 *
 * @example
 * ```typescript
 * export async function GET(
 *   req: NextRequest,
 *   { params }: { params: Promise<{ guildId: string }> }
 * ) {
 *   const { guildId } = await params;
 *   const auth = await requireGuildAccess(req, guildId);
 *   if (auth instanceof NextResponse) return auth;
 *
 *   // auth.guild, auth.isOwner, auth.hasAccess available
 * }
 * ```
 */
export async function requireGuildAccess(
	req: NextRequest,
	guildId: string,
	requireOwner: boolean = false
): Promise<GuildAuthContext | NextResponse> {
	// Get base auth context
	const authContext = await requireAuth(req);
	if (authContext instanceof NextResponse) return authContext;

	// Check if guild exists in database
	const guild = await getSingleGuildById(guildId);
	if (!guild) {
		return NextResponse.json({ error: "Guild not found" }, { status: 404 });
	}

	// Check if user has access to this guild on Discord
	const discordGuild = authContext.userGuilds.find((g) => g.id === guildId);
	const hasAccess = !!discordGuild;

	if (!hasAccess) {
		return NextResponse.json(
			{ error: "You do not have access to this guild" },
			{ status: 403 }
		);
	}

	// Check ownership if required
	const isOwner = guild.owner_id === authContext.discordUserId;
	if (requireOwner && !isOwner) {
		return NextResponse.json(
			{ error: "You must be the guild owner to perform this action" },
			{ status: 403 }
		);
	}

	return {
		...authContext,
		guild,
		discordGuild,
		isOwner,
		hasAccess,
	};
}

// ============================================================================
// System Admin Middleware
// ============================================================================

/**
 * Require authentication and verify user has 'admin' role in database.
 *
 * @param req - The request object
 */
export async function requireSystemAdmin(
	req: NextRequest
): Promise<(AuthContext & { dbUser: any }) | NextResponse> {
	const authContext = await requireAuth(req);
	if (authContext instanceof NextResponse) return authContext;

	// Check database user for admin role
	const { getUserByDiscordId } = await import("@/server/db");
	const dbUser = await getUserByDiscordId(authContext.discordUserId);

	if (!dbUser || dbUser.roles !== "admin") {
		return NextResponse.json(
			{
				error: "You must be a system administrator to perform this action",
			},
			{ status: 403 }
		);
	}

	return {
		...authContext,
		dbUser,
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has a specific Discord permission in a guild.
 *
 * @param discordGuild - The Discord guild object
 * @param permission - The permission bit to check
 */
export function hasPermission(
	discordGuild: DiscordGuild | undefined,
	permission: bigint
): boolean {
	if (!discordGuild) return false;
	if (discordGuild.owner) return true;
	if (!discordGuild.permissions) return false;

	const perms = BigInt(
		(discordGuild.permissions as string | number | undefined) ?? 0
	);
	return (perms & permission) !== BigInt(0);
}

/**
 * Discord permission bits
 */
export const DiscordPermissions = {
	ADMINISTRATOR: BigInt(1) << BigInt(3),
	MANAGE_GUILD: BigInt(1) << BigInt(5),
	MANAGE_CHANNELS: BigInt(1) << BigInt(4),
	VIEW_CHANNEL: BigInt(1) << BigInt(10),
	SEND_MESSAGES: BigInt(1) << BigInt(11),
	READ_MESSAGE_HISTORY: BigInt(1) << BigInt(16),
} as const;

/**
 * Check if user can manage a guild (owner or has ADMINISTRATOR or MANAGE_GUILD).
 */
export function canManageGuild(
	discordGuild: DiscordGuild | undefined
): boolean {
	return (
		hasPermission(discordGuild, DiscordPermissions.ADMINISTRATOR) ||
		hasPermission(discordGuild, DiscordPermissions.MANAGE_GUILD)
	);
}
