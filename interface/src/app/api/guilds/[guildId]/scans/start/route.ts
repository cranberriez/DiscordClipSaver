import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { startBatchScan } from "@/lib/redis/jobs";
import {
	getScanStatusesForChannels,
	upsertChannelScanStatus,
} from "@/server/db/queries/scan_status";
import { getChannelById } from "@/server/db/queries/channels";
import { rateLimit } from "@/server/rate-limit";

/**
 * POST /api/guilds/[guildId]/scans/start
 *
 * Start a scan for a single channel or multiple channels.
 * Requires guild ownership.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 10 requests per minute per user
	const limitResult = await rateLimit(
		`scan:${auth.discordUserId}`,
		10,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{
				error: "Rate limit exceeded. Please wait before starting more scans.",
				retryAfter: Math.ceil((limitResult.reset - Date.now()) / 1000),
			},
			{ status: 429 }
		);
	}

	// Parse request body
	let body;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body" },
			{ status: 400 }
		);
	}

	const {
		channelIds,
		isUpdate = false,
		isHistorical = false,
		isBackfill = false,
		limit = 100,
		autoContinue = true,
		rescan = "stop",
	} = body;

	// Validate channelIds
	if (!Array.isArray(channelIds) || channelIds.length === 0) {
		return NextResponse.json(
			{ error: "channelIds must be a non-empty array" },
			{ status: 400 }
		);
	}

	// Enforce limit cap
	const actualLimit = Math.min(Math.max(1, limit), 10000);

	// Validate rescan mode
	if (!["stop", "continue", "update"].includes(rescan)) {
		return NextResponse.json(
			{ error: "rescan must be 'stop', 'continue', or 'update'" },
			{ status: 400 }
		);
	}

	// Fetch existing statuses for all requested channels (Bulk Check)
	const existingStatuses = await getScanStatusesForChannels(
		guildId,
		channelIds
	);
	const statusMap = new Map(existingStatuses.map((s) => [s.channel_id, s]));

	// OPTIMIZATION: Bulk validate channel ownership
	// Fetch all valid channels from DB in one go
	// We can't query by IDs easily with existing functions, but we can fetch all guild channels
	// or create a new query. For now, let's fetch all guild channels (usually < 500) and filter.
	// Or even better, just modify the loop to fail if the individual fetch returns nothing (which it does).

	// But to be EXPLICIT as per audit, let's verify ownership first.
	// Actually, the loop does verify ownership because getChannelById checks guildId.
	// However, we can make it safer/faster by fetching valid IDs first.
	const { getDb } = await import("@/server/db");
	const validChannels = await getDb()
		.selectFrom("channel")
		.select("id")
		.where("guild_id", "=", guildId)
		.where("id", "in", channelIds)
		.where("deleted_at", "is", null)
		.execute();

	const validChannelIds = new Set(validChannels.map((c) => c.id));

	// Check if any requested channel is invalid
	const invalidChannelIds = channelIds.filter(
		(id) => !validChannelIds.has(id)
	);
	if (invalidChannelIds.length > 0) {
		// If we want to fail the whole request:
		// return NextResponse.json({ error: "One or more channels do not belong to this guild", invalidIds: invalidChannelIds }, { status: 400 });
		// If we want to return per-item errors (which the response format supports):
		// We'll handle it in the loop.
	}

	// Process each channel
	const results = await Promise.all(
		channelIds.map(async (channelId: string) => {
			try {
				// Validate channel exists and belongs to guild
				if (!validChannelIds.has(channelId)) {
					return {
						channelId,
						success: false,
						error: "Channel not found or does not belong to this guild",
					};
				}

				// Fetch full channel data for message_scan_enabled check
				// We could have fetched this in the bulk query above.
				const channel = await getChannelById(guildId, channelId);
				if (!channel) {
					return {
						channelId,
						success: false,
						error: "Channel not found",
					};
				}

				if (!channel.message_scan_enabled) {
					return {
						channelId,
						success: false,
						error: "Message scanning is disabled for this channel",
					};
				}

				// Check if scan is already running using our pre-fetched map
				const existingStatus = statusMap.get(channelId);

				if (
					existingStatus?.status === "RUNNING" ||
					existingStatus?.status === "QUEUED"
				) {
					return {
						channelId,
						success: false,
						error: "Scan is already running for this channel",
					};
				}

				// Determine scan parameters
				let direction: "forward" | "backward";
				let afterMessageId: string | undefined;
				let beforeMessageId: string | undefined;

				if (isHistorical) {
					// Historical scan: backward from beginning
					direction = "backward";
					beforeMessageId = undefined;
					afterMessageId = undefined;
				} else if (isBackfill) {
					// Backfill scan: backward from oldest known message
					direction = "backward";
					beforeMessageId =
						existingStatus?.backward_message_id || undefined;
					afterMessageId = undefined;
				} else if (isUpdate) {
					// Update scan: forward from last position
					direction = "forward";
					afterMessageId =
						existingStatus?.forward_message_id || undefined;
				} else {
					// Initial/continuation scan
					if (
						existingStatus?.forward_message_id ||
						existingStatus?.backward_message_id
					) {
						// Continue from last position
						direction = "forward";
						afterMessageId =
							existingStatus.forward_message_id || undefined;
					} else {
						// First scan
						direction = "forward";
					}
				}

				// Upsert channel scan status to QUEUED
				// This prevents the "unscanned" flash when UI refetches before worker picks up job
				await upsertChannelScanStatus(guildId, channelId, {
					status: "QUEUED",
				});

				// Start the scan
				const { jobId, messageId } = await startBatchScan({
					guildId,
					channelId,
					direction,
					limit: actualLimit,
					afterMessageId,
					beforeMessageId,
					autoContinue,
					rescan,
				});

				return {
					channelId,
					success: true,
					jobId,
					messageId,
				};
			} catch (error) {
				console.error(
					`Failed to start scan for channel ${channelId}:`,
					error
				);
				return {
					channelId,
					success: false,
					error:
						error instanceof Error
							? error.message
							: "Unknown error",
				};
			}
		})
	);

	// Count successes and failures
	const success = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;

	return NextResponse.json({
		success,
		failed,
		results,
	});
}
