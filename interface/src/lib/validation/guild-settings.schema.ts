import { z } from "zod";
import { isValidTimezone, normalizeTimezone } from "./timezone-helpers";

// Validation helpers
const cronRegex = /^(@(annually|yearly|monthly|weekly|daily|hourly|continuous))|(\S+\s+\S+\s+\S+\s+\S+\s+\S+)$/;

/**
 * Zod schema for guild settings validation.
 * Based on settings.default.jsonc structure.
 * 
 * This schema validates the JSON payload stored in the `settings` column
 * of the `guild_settings` table.
 */
export const GuildSettingsSchema = z.object({
    // =========================
    // BASIC
    // =========================
    enabled_by_default: z.boolean().optional(),
    parse_threads: z.boolean().optional(),
    tz: z.string()
        .transform(normalizeTimezone) // Convert PST → America/Los_Angeles
        .refine(isValidTimezone, {
            message: "Invalid timezone. Use abbreviations (PST, EST, UTC) or IANA format (America/Los_Angeles)"
        })
        .optional(),
    schedule_cron: z.string()
        .regex(cronRegex, "Invalid cron expression. Use standard cron or @hourly, @daily, etc.")
        .optional(),
}).strict(); // strict mode prevents unknown keys

/**
 * Zod schema for default channel settings validation.
 * Based on settings.default.jsonc structure.
 * 
 * This schema validates the JSON payload stored in the `default_channel_settings` column
 * of the `guild_settings` table.
 */
export const DefaultChannelSettingsSchema = z.object({
    // =========================
    // BASIC
    // =========================
    is_enabled: z.boolean().optional(),
    scan_mode: z.enum(["forward", "backfill"]).optional(),
    max_messages_per_pass: z.number()
        .int()
        .min(1, "Must be at least 1")
        .max(10000, "Cannot exceed 10,000")
        .optional(),
    debounce_ms: z.number()
        .int()
        .min(0, "Cannot be negative")
        .max(5000, "Cannot exceed 5 seconds")
        .optional(),
    include_threads: z.boolean().optional(),

    // =========================
    // MATCHING
    // =========================
    accept_video: z.boolean().optional(),
    min_video_seconds: z.number()
        .min(0, "Cannot be negative")
        .max(3600, "Cannot exceed 1 hour")
        .optional(),
    mime_allowlist: z.array(z.string().startsWith("video/")).optional(),
    text_include_regex: z.string()
        .nullable()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                try {
                    new RegExp(val);
                    return true;
                } catch {
                    return false;
                }
            },
            { message: "Invalid regex pattern" }
        ),
    text_exclude_regex: z.string()
        .nullable()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                try {
                    new RegExp(val);
                    return true;
                } catch {
                    return false;
                }
            },
            { message: "Invalid regex pattern" }
        ),
}).strict();

/**
 * Combined schema for updating guild settings.
 * This is what the API endpoint will validate against.
 */
export const UpdateGuildSettingsPayloadSchema = z.object({
    guild_id: z.string().min(1),
    settings: GuildSettingsSchema.partial().optional(),
    default_channel_settings: DefaultChannelSettingsSchema.partial().optional(),
}).strict();

// Type exports for TypeScript
export type GuildSettings = z.infer<typeof GuildSettingsSchema>;
export type DefaultChannelSettings = z.infer<typeof DefaultChannelSettingsSchema>;
export type UpdateGuildSettingsPayload = z.infer<typeof UpdateGuildSettingsPayloadSchema>;
