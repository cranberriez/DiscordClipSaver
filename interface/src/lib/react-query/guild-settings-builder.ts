import type {
    GuildSettings,
    DefaultChannelSettings,
} from "@/lib/schema/guild-settings.schema";

/**
 * Builder pattern for collecting guild settings changes.
 *
 * This class allows you to accumulate changes to guild settings
 * without directly manipulating the JSON payload. Once all changes
 * are collected, you can build the final payload to send to the API.
 *
 * @example
 * ```ts
 * const builder = new GuildSettingsBuilder("123456789");
 * builder.setGuildSetting("enabled_by_default", true);
 * builder.setGuildSetting("tz", "America/Los_Angeles");
 * builder.setDefaultChannelSetting("is_enabled", true);
 *
 * const payload = builder.build();
 * // Send payload to API
 * ```
 */
export class GuildSettingsBuilder {
    private guildId: string;
    private guildSettings: Partial<GuildSettings> = {};
    private defaultChannelSettings: Partial<DefaultChannelSettings> = {};

    constructor(guildId: string) {
        this.guildId = guildId;
    }

    /**
     * Set a guild-level setting.
     */
    setGuildSetting<K extends keyof GuildSettings>(
        key: K,
        value: GuildSettings[K]
    ): this {
        this.guildSettings[key] = value;
        return this;
    }

    /**
     * Set multiple guild-level settings at once.
     */
    setGuildSettings(settings: Partial<GuildSettings>): this {
        Object.assign(this.guildSettings, settings);
        return this;
    }

    /**
     * Set a default channel setting.
     */
    setDefaultChannelSetting<K extends keyof DefaultChannelSettings>(
        key: K,
        value: DefaultChannelSettings[K]
    ): this {
        this.defaultChannelSettings[key] = value;
        return this;
    }

    /**
     * Set multiple default channel settings at once.
     */
    setDefaultChannelSettings(settings: Partial<DefaultChannelSettings>): this {
        Object.assign(this.defaultChannelSettings, settings);
        return this;
    }

    /**
     * Remove a guild-level setting from the pending changes.
     */
    removeGuildSetting(key: keyof GuildSettings): this {
        delete this.guildSettings[key];
        return this;
    }

    /**
     * Remove a default channel setting from the pending changes.
     */
    removeDefaultChannelSetting(key: keyof DefaultChannelSettings): this {
        delete this.defaultChannelSettings[key];
        return this;
    }

    /**
     * Clear all pending guild settings changes.
     */
    clearGuildSettings(): this {
        this.guildSettings = {};
        return this;
    }

    /**
     * Clear all pending default channel settings changes.
     */
    clearDefaultChannelSettings(): this {
        this.defaultChannelSettings = {};
        return this;
    }

    /**
     * Clear all pending changes.
     */
    clearAll(): this {
        this.guildSettings = {};
        this.defaultChannelSettings = {};
        return this;
    }

    /**
     * Get the current pending guild settings changes.
     */
    getGuildSettings(): Readonly<Partial<GuildSettings>> {
        return { ...this.guildSettings };
    }

    /**
     * Get the current pending default channel settings changes.
     */
    getDefaultChannelSettings(): Readonly<Partial<DefaultChannelSettings>> {
        return { ...this.defaultChannelSettings };
    }

    /**
     * Check if there are any pending changes.
     */
    hasChanges(): boolean {
        return (
            Object.keys(this.guildSettings).length > 0 ||
            Object.keys(this.defaultChannelSettings).length > 0
        );
    }

    /**
     * Build the final payload to send to the API.
     * Returns null if there are no changes.
     */
    build() {
        if (!this.hasChanges()) {
            return null;
        }

        const payload: {
            guild_id: string;
            settings?: Partial<GuildSettings>;
            default_channel_settings?: Partial<DefaultChannelSettings>;
        } = {
            guild_id: this.guildId,
        };

        if (Object.keys(this.guildSettings).length > 0) {
            payload.settings = { ...this.guildSettings };
        }

        if (Object.keys(this.defaultChannelSettings).length > 0) {
            payload.default_channel_settings = {
                ...this.defaultChannelSettings,
            };
        }

        return payload;
    }

    /**
     * Create a new builder with the same guild ID but no changes.
     */
    clone(): GuildSettingsBuilder {
        return new GuildSettingsBuilder(this.guildId);
    }
}
