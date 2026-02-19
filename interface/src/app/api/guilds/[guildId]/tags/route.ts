import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import * as db from "@/server/db/queries/tags";
import { ClipMapper } from "@/server/mappers/clip-mapper";

/**
 * GET /api/guilds/[guildId]/tags
 *
 * Get all tags for a guild.
 * Permission: Authenticated user with access to the guild
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;
	const auth = await requireGuildAccess(req, guildId);

	if (auth instanceof NextResponse) return auth;

	try {
		const tags = await db.getServerTags(guildId);

		return NextResponse.json(tags.map(ClipMapper.toTag));
	} catch (error) {
		console.error("Failed to fetch guild tags:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
