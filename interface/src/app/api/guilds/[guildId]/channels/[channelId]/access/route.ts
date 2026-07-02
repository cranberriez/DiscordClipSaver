import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { getChannelById, setChannelAccessOverride } from "@/server/db";
import { z } from "zod";
import { rateLimit } from "@/server/rate-limit";

const AccessSchema = z.object({
	// "auto" clears the override so the channel follows its synced
	// Discord visibility (everyone_can_view).
	access: z.enum(["auto", "visible", "restricted"]),
});

/**
 * POST /api/guilds/[guildId]/channels/[channelId]/access
 *
 * Set the channel access override for the clip browser.
 * - "restricted": clips hidden from regular members (owner still sees them)
 * - "visible":    clips shown even if the channel is private on Discord
 * - "auto":       follow the synced Discord @everyone visibility
 *
 * Requires guild ownership.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string; channelId: string }> }
) {
	const { guildId, channelId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 20 requests per minute per user
	const limitResult = await rateLimit(
		`channel_access:${auth.discordUserId}`,
		20,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	// Verify channel belongs to guild
	const channel = await getChannelById(guildId, channelId);
	if (!channel) {
		return NextResponse.json(
			{ error: "Channel not found or does not belong to this guild" },
			{ status: 404 }
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON in request body" },
			{ status: 400 }
		);
	}

	const validation = AccessSchema.safeParse(body);
	if (!validation.success) {
		return NextResponse.json(
			{
				error: "Invalid request body",
				details: validation.error.format(),
			},
			{ status: 400 }
		);
	}

	const override =
		validation.data.access === "auto" ? null : validation.data.access;

	const updated = await setChannelAccessOverride(
		guildId,
		channelId,
		override
	);
	if (!updated) {
		return NextResponse.json(
			{ error: "Failed to update channel access" },
			{ status: 500 }
		);
	}

	return NextResponse.json({
		channelId,
		access: validation.data.access,
	});
}
