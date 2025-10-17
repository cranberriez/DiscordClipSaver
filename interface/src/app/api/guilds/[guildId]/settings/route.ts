import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/lib/middleware/auth";
import { getGuildSettings, upsertGuildSettings } from "@/lib/db";
import {
    UpdateGuildSettingsPayloadSchema,
    GuildSettingsSchema,
    DefaultChannelSettingsSchema,
} from "@/lib/schemas/guild-settings.schema";

/**
 * GET /api/guilds/[guildId]/settings
 *
 * Retrieve guild settings for a specific guild.
 * Requires guild ownership.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and ownership
    const auth = await requireGuildAccess(req, guildId, true);
    if (auth instanceof NextResponse) return auth;

    // Get guild settings
    const settings = await getGuildSettings(guildId);

    if (!settings) {
        return NextResponse.json({
            guild_id: guildId,
            settings: null,
            default_channel_settings: null,
        });
    }

    return NextResponse.json({
        guild_id: guildId,
        settings: settings.settings,
        default_channel_settings: settings.default_channel_settings,
    });
}

/**
 * PATCH /api/guilds/[guildId]/settings
 *
 * Update guild settings. This performs a partial update (merge) with existing settings.
 * Requires guild ownership.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and ownership
    const auth = await requireGuildAccess(req, guildId, true);
    if (auth instanceof NextResponse) return auth;

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

    // Validate the payload structure
    const payloadValidation = UpdateGuildSettingsPayloadSchema.safeParse(body);
    if (!payloadValidation.success) {
        return NextResponse.json(
            {
                error: "Validation failed",
                details: payloadValidation.error.format(),
            },
            { status: 400 }
        );
    }

    const payload = payloadValidation.data;

    // Ensure guild_id in payload matches URL parameter
    if (payload.guild_id !== guildId) {
        return NextResponse.json(
            { error: "Guild ID mismatch between URL and payload" },
            { status: 400 }
        );
    }

    // Validate individual settings if provided
    if (payload.settings) {
        const settingsValidation = GuildSettingsSchema.partial().safeParse(
            payload.settings
        );
        if (!settingsValidation.success) {
            return NextResponse.json(
                {
                    error: "Invalid guild settings",
                    details: settingsValidation.error.format(),
                },
                { status: 400 }
            );
        }
    }

    if (payload.default_channel_settings) {
        const channelSettingsValidation =
            DefaultChannelSettingsSchema.partial().safeParse(
                payload.default_channel_settings
            );
        if (!channelSettingsValidation.success) {
            return NextResponse.json(
                {
                    error: "Invalid default channel settings",
                    details: channelSettingsValidation.error.format(),
                },
                { status: 400 }
            );
        }
    }

    // Update settings
    try {
        const updatedSettings = await upsertGuildSettings(
            guildId,
            payload.settings as Record<string, unknown> | undefined,
            payload.default_channel_settings as
                | Record<string, unknown>
                | undefined
        );

        return NextResponse.json({
            guild_id: guildId,
            settings: updatedSettings.settings,
            default_channel_settings: updatedSettings.default_channel_settings,
        });
    } catch (error) {
        console.error("Failed to update guild settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
