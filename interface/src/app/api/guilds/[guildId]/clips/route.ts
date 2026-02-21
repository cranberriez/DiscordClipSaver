import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { z } from "zod";
import { rateLimit } from "@/server/rate-limit";

const ClipsQuerySchema = z.object({
	channelIds: z
		.string()
		.transform((val) => val.split(",").map((id) => id.trim()))
		.pipe(z.array(z.string().regex(/^\d{17,21}$/, "Invalid channel ID")))
		.optional(),
	authorIds: z
		.string()
		.transform((val) => val.split(",").map((id) => id.trim()))
		.pipe(z.array(z.string().regex(/^\d{17,21}$/, "Invalid author ID")))
		.optional(),
	tagsAny: z
		.string()
		.transform((val) => val.split(",").map((t) => t.trim()))
		.optional(),
	tagsAll: z
		.string()
		.transform((val) => val.split(",").map((t) => t.trim()))
		.optional(),
	tagsExclude: z
		.string()
		.transform((val) => val.split(",").map((t) => t.trim()))
		.optional(),
	favorites: z.enum(["true", "false"]).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	sortType: z
		.enum(["date", "duration", "size", "likes", "random"])
		.default("date"),
});

/**
 * GET /api/guilds/[guildId]/clips?channelIds=xxx,yyy&authorIds=aaa,bbb&limit=50&offset=0&sort=desc&favorites=true
 *
 * Get clips for a guild with pagination and favorites support.
 * - If channelIds is provided: Returns clips for those specific channels (comma-separated)
 * - If authorIds is provided: Returns clips from those specific authors (comma-separated)
 * - If favorites=true: Returns only favorited clips for the authenticated user
 * - If both omitted: Returns all clips for the guild
 * - sort: "desc" (newest first) or "asc" (oldest first), defaults to "desc"
 *
 * Requires user to have access to the guild.
 * Returns clips with isFavorited status for authenticated users.
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and guild access
	const auth = await requireGuildAccess(req, guildId);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`get_clips:${auth.discordUserId}`,
		30,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	// Get query parameters
	const searchParams = Object.fromEntries(req.nextUrl.searchParams);

	// Validate query parameters
	const validation = ClipsQuerySchema.safeParse(searchParams);

	if (!validation.success) {
		return NextResponse.json(
			{
				error: "Invalid query parameters",
				details: validation.error.format(),
			},
			{ status: 400 }
		);
	}

	const {
		channelIds,
		authorIds,
		tagsAny,
		tagsAll,
		tagsExclude,
		favorites,
		limit,
		offset,
		sortOrder,
		sortType,
	} = validation.data;

	const favoritesOnly = favorites === "true";

	try {
		// Fetch one extra to determine if there are more results
		// Pass user ID for favorites support
		const clips = channelIds
			? await DataService.getClipsByChannelIds(
					channelIds,
					offset,
					limit + 1,
					sortOrder,
					sortType,
					authorIds,
					auth.discordUserId, // User ID for favorites
					favoritesOnly,
					auth.isOwner, // Pass isGuildOwner
					tagsAny,
					tagsAll,
					tagsExclude
				)
			: await DataService.getClipsByGuildId(
					guildId,
					offset,
					limit + 1,
					sortOrder,
					sortType,
					authorIds,
					auth.discordUserId, // User ID for favorites
					favoritesOnly,
					auth.isOwner, // Pass isGuildOwner
					tagsAny,
					tagsAll,
					tagsExclude
				);

		if (!clips) {
			console.error(
				`Clips not found, guildId: ${guildId}${
					channelIds ? `, channelIds: ${channelIds.join(",")}` : ""
				}`
			);
			return NextResponse.json(
				{ error: "Clips not found" },
				{ status: 404 }
			);
		}

		// Check if there are more results
		const hasMore = clips.length > limit;
		const clipsToReturn = hasMore ? clips.slice(0, limit) : clips;

		return NextResponse.json({
			clips: clipsToReturn,
			pagination: {
				limit,
				offset,
				total: offset + clipsToReturn.length + (hasMore ? 1 : 0), // Approximate total
				hasMore,
			},
		});
	} catch (error) {
		console.error("Failed to fetch clips:", error);
		return NextResponse.json(
			{ error: "Failed to fetch clips" },
			{ status: 500 }
		);
	}
}
