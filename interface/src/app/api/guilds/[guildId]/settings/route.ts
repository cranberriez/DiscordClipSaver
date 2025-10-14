import { NextRequest, NextResponse } from "next/server";
import { tryGetAuthInfo } from "@/lib/auth";
import {
    getGuildSettings,
    upsertGuildSettings,
    getSingleGuildById,
} from "@/lib/db";
import {
    UpdateGuildSettingsPayloadSchema,
    GuildSettingsSchema,
    DefaultChannelSettingsSchema,
} from "@/lib/validation/guild-settings.schema";
import { z } from "zod";

/**
 * GET /api/guilds/[guildId]/settings
 *
 * Retrieve guild settings for a specific guild.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication
    const authInfo = await tryGetAuthInfo(req);
    if (!authInfo) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify guild exists and user has access
    const guild = await getSingleGuildById(guildId);
    if (!guild) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Verify user owns this guild
    if (guild.owner_id !== authInfo.discordUserId) {
        return NextResponse.json(
            { error: "Forbidden: You do not own this guild" },
            { status: 403 }
        );
    }

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
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication
    const authInfo = await tryGetAuthInfo(req);
    if (!authInfo) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify guild exists and user has access
    const guild = await getSingleGuildById(guildId);
    if (!guild) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Verify user owns this guild
    if (guild.owner_id !== authInfo.discordUserId) {
        return NextResponse.json(
            { error: "Forbidden: You do not own this guild" },
            { status: 403 }
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
