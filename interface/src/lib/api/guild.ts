// src/lib/api/guilds.ts
import { api } from "@/lib/api/client";
import type { UpdateGuildSettingsPayload } from "../schema/guild-settings.schema";

/**
 * Guild DTO as returned by the API
 */
export interface Guild {
    id: string;
    name: string;
    icon_url: string | null;
    owner_id: string | null;
    message_scan_enabled: boolean;
    last_message_scan_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

/**
 * Guild DTO as returned by the Discord API
 */
export interface DiscordGuild {
    id: string;
    name: string;
    icon: string;
    owner: boolean;
    owner_id: string;
    permissions: string;
    features: string[];
}

/**
 * Response from GET /api/guilds/?includePerms=1
 */
export interface GuildResponse extends Guild {
    permissions: string;
}

/**
 * Response from POST /api/guilds/[guildId]/toggle
 */
export interface ToggleScanningResponse {
    success: boolean;
    enabled: boolean;
}

// List guilds (Discord + DB enrichment)
export function getGuilds(includePerms?: boolean) {
    return api.guilds.list(includePerms); // GET /api/guilds/?includePerms=1
}

// Single guild (if/when you add this endpoint)
export function getGuild(guildId: string) {
    return api.guilds.get(guildId); // (or however your client exposes it)
}

// Settings
// export function getGuildSettings(guildId: string) {
//     return api.settings.get(guildId); // your existing client method
// }

// export function updateGuildSettings(
//     guildId: string,
//     payload: UpdateGuildSettingsPayload
// ) {
//     return api.settings.update(guildId, payload); // PATCH
// }

export function toggleScanning(guildId: string, enabled: boolean) {
    return api.guilds.toggleScanning(guildId, enabled); // POST /api/guilds/[guildId]/toggle
}
