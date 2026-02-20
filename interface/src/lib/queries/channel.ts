import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Channel } from "@/lib/api/channel";
import { QueryClient } from "@tanstack/react-query";

export const channelKeys = {
	all: ["channels"] as const,
	byGuild: (guildId: string) => [...channelKeys.all, guildId] as const,
	statsByGuild: (guildId: string) =>
		[...channelKeys.byGuild(guildId), "stats"] as const,
	// add more as you grow:
	// listByGuild: (guildId: string) => [...channelKeys.byGuild(guildId), "list"] as const,
	// detail: (channelId: string) => [...channelKeys.all, "detail", channelId] as const,
};

export const guildChannelsQuery = (guildId: string) =>
	queryOptions({
		queryKey: channelKeys.byGuild(guildId),
		queryFn: () => api.channels.list(guildId),
		enabled: !!guildId,
		staleTime: 120_000, // 2 minutes
	});

export const channelStatsByGuildQuery = (guildId: string) =>
	queryOptions({
		queryKey: channelKeys.statsByGuild(guildId),
		queryFn: () => api.channels.stats(guildId),
		enabled: !!guildId,
		staleTime: 120_000, // 2 minutes
	});

export function optimisticBulkUpdateChannels(
	qc: QueryClient,
	guildId: string,
	enabled: boolean
) {
	const key = channelKeys.byGuild(guildId);
	const prev = qc.getQueryData<Channel[]>(key);
	if (!prev) return { prev };

	const optimistic: Channel[] = prev.map((ch) => ({
		...ch,
		message_scan_enabled: enabled,
	}));
	qc.setQueryData(key, optimistic);

	return { prev };
}

export function optimisticToggleChannel(
	qc: QueryClient,
	guildId: string,
	channelId: string,
	enabled: boolean
) {
	const key = channelKeys.byGuild(guildId);
	const prev = qc.getQueryData<Channel[]>(key);
	if (!prev) return { prev };

	const optimistic: Channel[] = prev.map((ch) =>
		ch.id === channelId ? { ...ch, message_scan_enabled: enabled } : ch
	);
	qc.setQueryData(key, optimistic);

	return { prev };
}
