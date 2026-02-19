import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess, canManageGuild } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/guilds/[guildId]
 *
 * Get a single guild by ID.
 * Requires guild access (Admin or Manage Guild permissions).
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and access (not strictly owner)
	const auth = await requireGuildAccess(req, guildId, false);
	if (auth instanceof NextResponse) return auth;

	// Check permissions (Admin or Manage Guild)
	if (!canManageGuild(auth.discordGuild)) {
		return NextResponse.json(
			{ error: "You do not have permission to view this guild" },
			{ status: 403 }
		);
	}

	try {
		const guild = await DataService.getSingleGuildById(guildId);

		if (!guild) {
			return NextResponse.json(
				{ error: "Guild not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(guild);
	} catch (error) {
		console.error("Failed to fetch guild:", error);
		return NextResponse.json(
			{ error: "Failed to fetch guild" },
			{ status: 500 }
		);
	}
}
