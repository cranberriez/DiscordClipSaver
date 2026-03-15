import { NextRequest, NextResponse } from "next/server";
import {
	GuildUserSettingsSchema,
	defaultUserSettings,
} from "@/lib/schema/guild-user-settings.schema";
import { DataService } from "@/server/services/data-service";
import { requireGuildAccess } from "@/server/middleware/auth";
import { rateLimit } from "@/server/rate-limit";
import { upsertGuildSettings } from "@/server/db";

// GET /api/guilds/[guildId]/user-settings
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(request, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 20 requests per minute
	const limitResult = await rateLimit(
		`get_user_settings:${auth.discordUserId}`,
		20,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	try {
		// Get guild settings from database
		const guildSettings = await DataService.getGuildSettings(guildId);
		const settings = (guildSettings?.settings ?? {}) as Record<
			string,
			unknown
		>;

		// Extract only user-facing settings, merge with defaults
		const userSettings = {
			default_visibility:
				(settings.default_visibility as string | undefined) ??
				defaultUserSettings.default_visibility,
			ignore_nsfw_channels:
				(settings.ignore_nsfw_channels as boolean | undefined) ??
				defaultUserSettings.ignore_nsfw_channels,
			auto_archive_after:
				(settings.auto_archive_after as number | undefined) ??
				defaultUserSettings.auto_archive_after,
			max_clips_per_channel_per_day:
				(settings.max_clips_per_channel_per_day as
					| number
					| undefined) ??
				defaultUserSettings.max_clips_per_channel_per_day,
			live_scan_slow_mode:
				(settings.live_scan_slow_mode as number | undefined) ??
				defaultUserSettings.live_scan_slow_mode,
		};

		return NextResponse.json(userSettings);
	} catch (error) {
		console.error("Failed to fetch user settings:", error);
		return NextResponse.json(
			{ error: "Failed to fetch user settings" },
			{ status: 500 }
		);
	}
}

// PUT /api/guilds/[guildId]/user-settings
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(request, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 10 updates per minute
	const limitResult = await rateLimit(
		`update_user_settings:${auth.discordUserId}`,
		10,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{
				error: "Rate limit exceeded. Please wait before updating settings again.",
			},
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();

		// Validate the user settings
		const validation = GuildUserSettingsSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Invalid settings data",
					details: validation.error.issues,
				},
				{ status: 400 }
			);
		}

		const userSettings = validation.data;

		// Get current guild settings to preserve non-user settings
		const currentGuildSettings =
			await DataService.getGuildSettings(guildId);
		const currentSettings = (currentGuildSettings?.settings ??
			{}) as Record<string, unknown>;
		const currentChannelSettings =
			(currentGuildSettings?.default_channel_settings ?? undefined) as
				| Record<string, unknown>
				| undefined;

		// Merge user settings with existing settings (preserving bot/system settings)
		const updatedSettings: Record<string, unknown> = {
			...currentSettings,
			...userSettings, // User settings override
		};

		// Update guild settings in database using upsertGuildSettings
		await upsertGuildSettings(
			guildId,
			updatedSettings,
			currentChannelSettings
		);

		// Return only the user-facing settings
		return NextResponse.json(userSettings);
	} catch (error) {
		console.error("Failed to update user settings:", error);
		return NextResponse.json(
			{ error: "Failed to update user settings" },
			{ status: 500 }
		);
	}
}
