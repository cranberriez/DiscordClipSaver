import { type SettingMetadata } from "../types";
/**
 * Settings metadata for dynamic form generation (optional).
 *
 * This provides UI hints and descriptions for each setting.
 * Can be used to generate forms automatically in the future.
 */

export const guildSettingsMetadata: Record<string, SettingMetadata> = {
    enabled_by_default: {
        label: "Enable new channels by default",
        description:
            "When enabled, newly discovered channels will automatically start scanning for clips",
        type: "boolean",
    },
    tz: {
        label: "Timezone",
        description:
            "Use abbreviations (PST, EST, UTC, GMT) or full names (America/Los_Angeles)",
        type: "text",
        placeholder: "UTC",
    },
    parse_threads: {
        label: "Parse thread messages",
        description: "Include messages from threads when scanning for clips",
        type: "boolean",
        advanced: true,
    },
    schedule_cron: {
        label: "Schedule (Cron Expression)",
        description:
            "When the bot should run jobs (e.g., @hourly, @continuous, */5 * * * *)",
        type: "text",
        placeholder: "@hourly",
        advanced: true,
    },
};

export const channelSettingsMetadata: Record<string, SettingMetadata> = {
    is_enabled: {
        label: "Enable channels by default",
        description: "New channels will start scanning immediately",
        type: "boolean",
    },
    scan_mode: {
        label: "Scan Mode",
        description:
            "Forward scans messages after the last scanned message. Backfill scans older messages.",
        type: "select",
        options: [
            { value: "forward", label: "Forward (scan new messages)" },
            { value: "backfill", label: "Backfill (scan old messages)" },
        ],
    },
    max_messages_per_pass: {
        label: "Max Messages Per Pass",
        description: "Maximum number of messages to scan in a single pass",
        type: "number",
        min: 1,
        max: 10000,
        placeholder: "1000",
        advanced: true,
    },
    debounce_ms: {
        label: "Debounce (milliseconds)",
        description: "Throttle in-memory updates for hot channels",
        type: "number",
        min: 0,
        max: 5000,
        placeholder: "250",
        advanced: true,
    },
    include_threads: {
        label: "Include threads",
        description:
            "For forum/threaded channels, treat parent only unless true",
        type: "boolean",
        advanced: true,
    },
    accept_video: {
        label: "Accept video attachments",
        description: "Process messages with video attachments",
        type: "boolean",
    },
    min_video_seconds: {
        label: "Minimum Video Duration (seconds)",
        description:
            "Ignore videos shorter than this duration (0 = no minimum)",
        type: "number",
        min: 0,
        max: 3600,
        placeholder: "0",
    },
    text_include_regex: {
        label: "Text Include Regex (Optional)",
        description: "Only process messages matching this regex pattern",
        type: "text",
        placeholder: "clip|timestamp",
    },
    text_exclude_regex: {
        label: "Text Exclude Regex (Optional)",
        description: "Skip messages matching this regex pattern",
        type: "text",
        placeholder: "bot|spam",
    },
};
