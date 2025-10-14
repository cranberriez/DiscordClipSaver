import type { GuildSettings, DefaultChannelSettings } from "@/lib/validation/guild-settings.schema";

export interface GuildSettingsResponse {
    guild_id: string;
    settings: GuildSettings | null;
    default_channel_settings: DefaultChannelSettings | null;
}

export interface UpdateGuildSettingsRequest {
    guild_id: string;
    settings?: Partial<GuildSettings>;
    default_channel_settings?: Partial<DefaultChannelSettings>;
}

/**
 * Fetch guild settings from the API.
 */
export async function fetchGuildSettings(
    guildId: string
): Promise<GuildSettingsResponse> {
    const response = await fetch(`/api/guilds/${guildId}/settings`);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `Failed to fetch guild settings: ${response.status}`);
    }

    return response.json();
}

/**
 * Update guild settings via the API.
 * This performs a partial update (merge) with existing settings.
 */
export async function updateGuildSettings(
    guildId: string,
    settings?: Partial<GuildSettings>,
    defaultChannelSettings?: Partial<DefaultChannelSettings>
): Promise<GuildSettingsResponse> {
    const payload: UpdateGuildSettingsRequest = {
        guild_id: guildId,
    };

    if (settings) {
        payload.settings = settings;
    }

    if (defaultChannelSettings) {
        payload.default_channel_settings = defaultChannelSettings;
    }

    const response = await fetch(`/api/guilds/${guildId}/settings`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `Failed to update guild settings: ${response.status}`);
    }

    return response.json();
}
