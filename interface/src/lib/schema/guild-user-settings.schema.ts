import { z } from "zod";

/**
 * Schema for user-facing guild settings only.
 * These are the settings that users can modify through the interface.
 */
export const GuildUserSettingsSchema = z.object({
	default_visibility: z.enum(["public", "unlisted", "private"]).default("unlisted"),
	ignore_nsfw_channels: z.boolean().default(true),
	auto_archive_after: z.object({
		unit: z.enum(["never", "days", "weeks", "months"]).default("never"),
		count: z.number().min(0).default(0),
	}).default({ unit: "never", count: 0 }),
	max_clips_per_channel_per_day: z.number().min(0).default(0),
	live_scan_slow_mode: z.object({
		enabled: z.boolean().default(false),
		delay_seconds: z.number().min(1).default(30),
	}).default({ enabled: false, delay_seconds: 30 }),
});

export type GuildUserSettings = z.infer<typeof GuildUserSettingsSchema>;

/**
 * Metadata for user settings including UI hints and warnings
 */
export interface UserSettingMetadata {
	label: string;
	description: string;
	type: "boolean" | "select" | "number" | "object";
	options?: { value: string; label: string }[];
	min?: number;
	max?: number;
	invalidates_scans?: boolean; // If changing this setting makes previous/ongoing scans invalid
	note?: string; // Important note to display to users
}

/**
 * Metadata for all user-facing settings
 */
export const userSettingsMetadata: Record<keyof GuildUserSettings, UserSettingMetadata> = {
	default_visibility: {
		label: "Default Clip Visibility",
		description: "Default visibility level for newly scanned clips",
		type: "select",
		options: [
			{ value: "public", label: "Public - Visible to everyone" },
			{ value: "unlisted", label: "Unlisted - Only visible with direct link" },
			{ value: "private", label: "Private - Only visible to you" },
		],
		note: "Changing this value will not change visibility of already scanned clips",
	},
	ignore_nsfw_channels: {
		label: "Ignore NSFW Channels",
		description: "Skip scanning channels marked as NSFW",
		type: "boolean",
		invalidates_scans: true,
	},
	auto_archive_after: {
		label: "Auto Archive After",
		description: "Automatically archive clips after a specified time period",
		type: "object",
	},
	max_clips_per_channel_per_day: {
		label: "Max Clips Per Channel Per Day",
		description: "Maximum number of clips to scan per channel per day (0 = unlimited)",
		type: "number",
		min: 0,
		max: 1000,
		invalidates_scans: true,
	},
	live_scan_slow_mode: {
		label: "Live Scan Slow Mode",
		description: "Add delays between scanning messages to reduce server load",
		type: "object",
		invalidates_scans: true,
	},
};

/**
 * Default values for user settings
 */
export const defaultUserSettings: GuildUserSettings = {
	default_visibility: "unlisted",
	ignore_nsfw_channels: true,
	auto_archive_after: {
		unit: "never",
		count: 0,
	},
	max_clips_per_channel_per_day: 0,
	live_scan_slow_mode: {
		enabled: false,
		delay_seconds: 30,
	},
};
