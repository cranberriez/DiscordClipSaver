import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";
import { updateClipCdnUrl } from "@/server/db/queries/clips";
import { calculateExpiresAt } from "@/server/expires-at";

/**
 * POST /api/clips/[clipId]/refresh-cdn
 *
 * Refresh the CDN URL for a clip by fetching fresh attachment data from Discord bot.
 * This is called when a CDN URL has expired (typically after 24 hours).
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ clipId: string }> }
) {
    console.log("DEPRECATED ROUTE CALL!!!");
    return NextResponse.json({ error: "Deprecated route" }, { status: 400 });

    const { clipId } = await params;

    // Verify authentication
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const clipWithMetadata = await DataService.getClipById(clipId);

        if (!clipWithMetadata) {
            return NextResponse.json(
                { error: "Clip not found" },
                { status: 404 }
            );
        }

        // Verify user has access to the guild
        const hasAccess = auth.userGuilds.some(
            g => g.id === clipWithMetadata.message.guild_id
        );

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Call the bot's FastAPI endpoint to get fresh CDN URLs
        // Must be set in .env: http://bot:8000 (Docker) or http://127.0.0.1:8000 (local)
        const botApiUrl = process.env.BOT_API_URL;
        if (!botApiUrl) {
            console.error("BOT_API_URL environment variable is not set");
            return NextResponse.json(
                { error: "Bot API URL not configured" },
                { status: 500 }
            );
        }
        console.log(`Calling bot API at: ${botApiUrl}/refresh-cdn`);

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
        const urlObj = new URL(attachment.url);
        const expiresAt = calculateExpiresAt(urlObj.href);
        await updateClipCdnUrl(clipId, attachment.url, expiresAt);

        return NextResponse.json({
            cdn_url: attachment.url,
            expires_at: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error("Failed to refresh CDN URL:", error);

        // Provide more detailed error information
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        const errorCause =
            error instanceof Error && "cause" in error
                ? JSON.stringify(error.cause)
                : "No cause";

        console.error("Error details:", {
            message: errorMessage,
            cause: errorCause,
        });

        return NextResponse.json(
            {
                error: "Failed to refresh CDN URL",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
