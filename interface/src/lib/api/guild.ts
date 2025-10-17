// src/lib/api/guilds.ts
import { api } from "@/lib/api/client";
import type { DiscordGuild } from "@/lib/discord/types";
import type { Guild } from "@/lib/db/types";
import type { UpdateGuildSettingsPayload } from "../schema/guild-settings.schema";

/**
 * Response from GET /api/discord/user/guilds?includeDb=1
 */
export interface GuildsListResponse {
    guilds: DiscordGuild[];
    dbGuilds: Guild[];
}

/**
 * Response from POST /api/guilds/[guildId]/toggle
 */
export interface ToggleScanningResponse {
    success: boolean;
    enabled: boolean;
}

// List guilds (Discord + DB enrichment)
export function getGuilds() {
    return api.guilds.list(); // GET /api/discord/user/guilds?includeDb=1
}

// Single guild (if/when you add this endpoint)
export function getGuild(guildId: string) {
    return api.guilds.get(guildId); // (or however your client exposes it)
}

// Settings
export function getGuildSettings(guildId: string) {
    return api.settings.get(guildId); // your existing client method
}

export function updateGuildSettings(
    guildId: string,
    payload: UpdateGuildSettingsPayload
) {
    return api.settings.update(guildId, payload); // PATCH
}

export function toggleScanning(guildId: string, enabled: boolean) {
    return api.guilds.toggleScanning(guildId, enabled); // POST /api/guilds/[guildId]/toggle
}
