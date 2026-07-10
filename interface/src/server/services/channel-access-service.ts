import "server-only";

import type { Channel } from "@/lib/api/channel";
import { fetchBotApi } from "@/server/bot-api";
import { z } from "zod";

const ChannelAccessResponseSchema = z.object({
	guild_id: z.string(),
	user_id: z.string(),
	channel_ids: z.array(z.string()),
	is_member: z.boolean(),
	is_administrator: z.boolean(),
	source: z.enum(["discord", "cache"]),
});

export type ChannelAccessResolution = {
	channelIds: string[] | undefined;
	degraded: boolean;
};

function applyOwnerOverrides(
	channels: Channel[],
	discordChannelIds: Set<string> | null
): string[] {
	return channels
		.filter((channel) => {
			if (channel.access_override === "restricted") return false;
			if (channel.access_override === "visible") return true;

			// A null set is the safe degraded path: only channels independently
			// known to be visible to @everyone may be returned.
			return discordChannelIds
				? discordChannelIds.has(channel.id)
				: channel.everyone_can_view;
		})
		.map((channel) => channel.id);
}

/**
 * Resolve the exact Discord channels a member can view.
 *
 * The bot API owns the revisioned Redis cache. If Discord or that service is
 * unavailable, fail closed for role/private channels while preserving access
 * to channels synchronized as visible to @everyone.
 */
export async function resolveAccessibleChannelIds(
	guildId: string,
	userId: string,
	isGuildOwner: boolean,
	channels: Channel[]
): Promise<ChannelAccessResolution> {
	if (isGuildOwner) {
		return { channelIds: undefined, degraded: false };
	}

	try {
		const response = await fetchBotApi(
			`/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(userId)}/channel-access`,
			{ method: "GET", cache: "no-store" },
			{ timeoutMs: 10_000 }
		);

		if (!response.ok) {
			throw new Error(`Bot API returned ${response.status}`);
		}

		const parsed = ChannelAccessResponseSchema.safeParse(
			await response.json()
		);
		if (!parsed.success) {
			throw new Error(
				"Bot API returned an invalid channel-access payload"
			);
		}

		if (!parsed.data.is_member) {
			return { channelIds: [], degraded: false };
		}

		return {
			channelIds: applyOwnerOverrides(
				channels,
				new Set(parsed.data.channel_ids)
			),
			degraded: false,
		};
	} catch (error) {
		console.warn(
			`Channel permission lookup degraded for guild ${guildId}:`,
			error instanceof Error ? error.message : "unknown error"
		);
		return {
			channelIds: applyOwnerOverrides(channels, null),
			degraded: true,
		};
	}
}
