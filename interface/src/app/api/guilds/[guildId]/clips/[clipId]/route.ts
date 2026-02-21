import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { updateClipCdnUrl } from "@/server/db/queries/clips";
import { rateLimit } from "@/server/rate-limit";

/**
 * GET /api/guilds/[guildId]/clips/[clipId]
 *
 * Get a single clip by ID with full metadata and favorites status.
 * Automatically refreshes expired CDN URLs transparently.
 * Verifies user has access to the guild.
 * Returns clip with isFavorited status for authenticated users.
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string; clipId: string }> }
) {
	const { guildId, clipId } = await params;

	// Verify authentication and guild access
	const auth = await requireGuildAccess(req, guildId);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 60 requests per minute (browsing clips)
	const limitResult = await rateLimit(
		`get_clip:${auth.discordUserId}`,
		60,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	try {
		// Pass user ID for favorites support
		const clipWithMetadata = await DataService.getClipById(
			clipId,
			auth.discordUserId
		);

		if (!clipWithMetadata) {
			return NextResponse.json(
				{ error: "Clip not found" },
				{ status: 404 }
			);
		}

		// Verify clip belongs to the guild
		if (clipWithMetadata.message.guild_id !== guildId) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		// Check if CDN URL has expired and refresh if needed
		const isExpired =
			new Date(clipWithMetadata.clip.expires_at) < new Date();

		if (isExpired) {
			console.log(`CDN URL expired for clip ${clipId}, refreshing...`);

			try {
				const botApiUrl = process.env.BOT_API_URL;
				if (!botApiUrl) {
					console.error(
						"BOT_API_URL not configured, returning expired URL"
					);
					return NextResponse.json(clipWithMetadata);
				}

				const response = await fetch(`${botApiUrl}/refresh-cdn`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						message_id: clipWithMetadata.message.id,
						channel_id: clipWithMetadata.message.channel_id,
					}),
				});

				if (response.ok) {
					const data = await response.json();
					const attachment = data.attachments.find(
						(att: any) =>
							att.filename === clipWithMetadata!.clip.filename
					);

					if (attachment) {
						// Update database with new CDN URL
						const expiresAt = new Date(
							Date.now() + 24 * 60 * 60 * 1000
						);
						await updateClipCdnUrl(
							clipId,
							attachment.url,
							expiresAt
						);

						// Update the response object
						clipWithMetadata.clip.cdn_url = attachment.url;
						clipWithMetadata.clip.expires_at = expiresAt;

						console.log(
							`Successfully refreshed CDN URL for clip ${clipId}`
						);
					} else {
						console.warn(
							`Attachment not found for clip ${clipId}, returning expired URL`
						);
					}
				} else {
					const errorData = await response.json().catch(() => ({}));
					console.warn(
						`Failed to refresh CDN URL for clip ${clipId}:`,
						errorData
					);
					// Continue with expired URL rather than failing the request
				}
			} catch (refreshError) {
				console.error(
					`Error refreshing CDN URL for clip ${clipId}:`,
					refreshError
				);
				// Continue with expired URL rather than failing the request
			}
		}

		return NextResponse.json(clipWithMetadata);
	} catch (error) {
		console.error("Failed to fetch clip:", error);
		return NextResponse.json(
			{ error: "Failed to fetch clip" },
			{ status: 500 }
		);
	}
}
