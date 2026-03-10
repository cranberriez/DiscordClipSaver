import type { ChannelWithStatus } from "../types";
import type { ScanStatusFilter, ScanSortBy } from "../stores/useScanVisibilityStore";

export function formatCount(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

export function getHitRate(channel: ChannelWithStatus): number | null {
	const scanned = channel.scanStatus?.total_messages_scanned;
	const clips = channel.scanStatus?.message_count;
	if (!scanned || scanned === 0 || clips === undefined) return null;
	return (clips / scanned) * 100;
}

export function getHitRateColor(rate: number): string {
	if (rate >= 5) return "text-green-500";
	if (rate >= 1) return "text-yellow-500";
	return "text-muted-foreground";
}

export function makeDiscordMessageLink(
	guildId: string,
	channelId: string,
	messageId: string
): string {
	return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function channelMatchesFilter(
	channel: ChannelWithStatus,
	filter: ScanStatusFilter
): boolean {
	if (filter === "all") return true;
	const status = channel.scanStatus?.status;
	if (filter === "ok")
		return (
			status === "SUCCEEDED" ||
			status === "RUNNING" ||
			status === "QUEUED"
		);
	if (filter === "failed")
		return status === "FAILED" || status === "CANCELLED";
	return true;
}

export function sortChannels(
	channels: ChannelWithStatus[],
	sortBy: ScanSortBy
): ChannelWithStatus[] {
	return [...channels].sort((a, b) => {
		if (sortBy === "name") return a.name.localeCompare(b.name);
		if (sortBy === "clips") {
			return (
				(b.scanStatus?.message_count ?? 0) -
				(a.scanStatus?.message_count ?? 0)
			);
		}
		if (sortBy === "scanned") {
			return (
				(b.scanStatus?.total_messages_scanned ?? 0) -
				(a.scanStatus?.total_messages_scanned ?? 0)
			);
		}
		if (sortBy === "last_scan") {
			const aTime = a.scanStatus?.updated_at
				? new Date(a.scanStatus.updated_at).getTime()
				: 0;
			const bTime = b.scanStatus?.updated_at
				? new Date(b.scanStatus.updated_at).getTime()
				: 0;
			return bTime - aTime;
		}
		return 0;
	});
}
