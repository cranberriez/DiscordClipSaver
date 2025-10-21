import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { updateClipCdnUrl } from "@/server/db/queries/clips";

/**
 * POST /api/guilds/[guildId]/clips/[clipId]/refresh
 *
 * Refresh the CDN URL for a clip by fetching fresh attachment data from Discord bot.
 * This is called when a CDN URL has expired (typically after 24 hours).
 * 
 * Returns the updated clip with new CDN URL and expiration timestamp.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string; clipId: string }> }
) {
    const { guildId, clipId } = await params;

    // Verify authentication and guild access
    const auth = await requireGuildAccess(req, guildId);
    if (auth instanceof NextResponse) return auth;

    try {
        const clipWithMetadata = await DataService.getClipById(clipId);

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

        // Call the bot's FastAPI endpoint to get fresh CDN URLs
        const botApiUrl = process.env.BOT_API_URL;
        if (!botApiUrl) {
            console.error("BOT_API_URL environment variable is not set");
            return NextResponse.json(
                { error: "Bot API URL not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(`${botApiUrl}/refresh-cdn`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message_id: clipWithMetadata.message.id,
                channel_id: clipWithMetadata.message.channel_id,
            }),
        });

        if (!response.ok) {
            // Try to parse JSON error for structured error types
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: await response.text() };
            }

            console.error("Bot API error:", errorData);

            // Pass through MESSAGE_DELETED error type for UI to handle gracefully
            if (
                response.status === 410 &&
                errorData.detail?.error_type === "MESSAGE_DELETED"
            ) {
                return NextResponse.json(
                    {
                        error_type: "MESSAGE_DELETED",
                        error:
                            errorData.detail.message ||
                            "This clip was deleted from Discord",
                    },
                    { status: 410 }
                );
            }

            // Generic error response for other failures
            return NextResponse.json(
                {
                    error:
                        errorData.error ||
                        errorData.detail ||
                        "Failed to refresh CDN URL from bot",
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Find the matching attachment by filename
        const attachment = data.attachments.find(
            (att: any) => att.filename === clipWithMetadata.clip.filename
        );

        if (!attachment) {
            return NextResponse.json(
                { error: "Attachment not found in message" },
                { status: 404 }
            );
        }

        // Update the clip with new CDN URL
        // Discord CDN URLs typically expire after 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await updateClipCdnUrl(clipId, attachment.url, expiresAt);

        return NextResponse.json({
            cdn_url: attachment.url,
            expires_at: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error("Failed to refresh CDN URL:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            {
                error: "Failed to refresh CDN URL",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
