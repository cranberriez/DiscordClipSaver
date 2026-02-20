import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { queueGuildPurge } from "@/lib/redis/jobs";
import { db } from "@/server/db";

/**
 * POST /api/guilds/[guildId]/purge
 *
 * Purge all data for a guild and leave it.
 * This is a destructive operation that:
 * - Deletes all thumbnail files
 * - Deletes all clips, messages, and thumbnails from database
 * - Soft deletes the guild (sets deleted_at)
 * - Makes the bot leave the guild
 *
 * Requires guild ownership.
 * No cooldown - this is a one-time destructive action.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Verify guild is not already deleted
	if (auth.guild.deleted_at) {
		return NextResponse.json(
			{ error: "Guild is already marked for deletion" },
			{ status: 400 }
		);
	}

	// Get clip count for confirmation
	const stats = await db
		.selectFrom("clip")
		.select((eb) => [eb.fn.count<number>("id").as("clip_count")])
		.where("guild_id", "=", guildId)
		.executeTakeFirst();

	// Queue purge job
	try {
		const { jobId } = await queueGuildPurge({
			guildId,
		});

		return NextResponse.json({
			success: true,
			job_id: jobId,
			message: "Guild purge job queued - bot will leave the guild",
			stats: {
				clips_to_delete: stats?.clip_count ?? 0,
			},
		});
	} catch (error) {
		console.error("Failed to queue guild purge:", error);
		return NextResponse.json(
			{ error: "Failed to queue purge job" },
			{ status: 500 }
		);
	}
}
