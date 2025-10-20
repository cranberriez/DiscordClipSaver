import { queryOptions } from "@tanstack/react-query";
import { api } from "../api/client";

export const guildSettingsKeys = {
    all: ["guildSettings"] as const,
    guild: (guildId: string) => [...guildSettingsKeys.all, guildId] as const,
};

export const defaultChannelSettingsKeys = {
    all: ["defaultChannelSettings"] as const,
    guild: (guildId: string) =>
        [...defaultChannelSettingsKeys.all, guildId] as const,
};

export const guildSettingsQuery = (guildId: string) =>
    queryOptions({
        queryKey: guildSettingsKeys.guild(guildId),
        queryFn: () => api.settings.get(guildId),
        enabled: !!guildId,
    });

export const defaultChannelSettingsQuery = (guildId: string) =>
    queryOptions({
        queryKey: defaultChannelSettingsKeys.guild(guildId),
        queryFn: () => api.settings.get(guildId),
        enabled: !!guildId,
    });
