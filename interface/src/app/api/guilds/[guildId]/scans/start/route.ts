import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { startBatchScan } from "@/lib/redis/jobs";
import {
	getScanStatusesForChannels,
	upsertChannelScanStatus,
} from "@/server/db/queries/scan_status";
import { getChannelById } from "@/server/db/queries/channels";

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

	// Process each channel
	const results = await Promise.all(
		channelIds.map(async (channelId: string) => {
			try {
				// Validate channel exists and is enabled
				// Note: We could optimize this with a bulk fetch too, but getChannelById is cached/fast usually
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
