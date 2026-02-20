import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { queueChannelPurge } from "@/lib/redis/jobs";
import { DataService } from "@/server/services/data-service";

/**
 * POST /api/guilds/[guildId]/channels/[channelId]/purge
 *
 * Purge all clips and data for a specific channel.
 * Requires guild ownership.
 * Enforces purge cooldown to prevent abuse.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string; channelId: string }> }
) {
	const { guildId, channelId } = await params;

	// Validate channelId is provided
	if (!channelId || channelId === "0" || channelId.trim() === "") {
		return NextResponse.json(
			{ error: "Channel ID is required" },
			{ status: 400 }
		);
	}

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Check if channel exists and belongs to this guild
	const channel = await DataService.getChannelById(guildId, channelId);

	if (!channel) {
		return NextResponse.json(
			{ error: "Channel not found or does not belong to this guild" },
			{ status: 404 }
		);
	}

	// Check purge cooldown
	if (channel.purge_cooldown) {
		const cooldownDate = new Date(channel.purge_cooldown);
		if (cooldownDate > new Date()) {
			return NextResponse.json(
				{
					error: "Purge cooldown active",
					cooldown_until: cooldownDate.toISOString(),
				},
				{ status: 429 }
			);
		}
	}

	// Queue purge job
	try {
		const { jobId } = await queueChannelPurge({
			guildId,
			channelId,
		});

		return NextResponse.json({
			success: true,
			job_id: jobId,
			message: "Channel purge job queued",
		});
	} catch (error) {
		console.error("Failed to queue channel purge:", error);
		return NextResponse.json(
			{ error: "Failed to queue purge job" },
			{ status: 500 }
		);
	}
}
