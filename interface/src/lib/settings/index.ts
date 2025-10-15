/**
 * Settings Module Exports
 * 
 * Re-exports for convenient imports.
 * Note: API calls and hooks are now in TanStack Query hooks.
 * See: src/lib/hooks/queries/useSettings.ts
 */

// Builder for collecting setting changes
export { GuildSettingsBuilder } from "./guild-settings-builder";

// Validation schemas and types
export {
    GuildSettingsSchema,
    DefaultChannelSettingsSchema,
    UpdateGuildSettingsPayloadSchema,
    type GuildSettings,
    type DefaultChannelSettings,
    type UpdateGuildSettingsPayload,
} from "../validation/guild-settings.schema";
