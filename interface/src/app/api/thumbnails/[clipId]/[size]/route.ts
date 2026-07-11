import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { DataService } from "@/server/services/data-service";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/rate-limit";
import { resolveAccessibleChannelIds } from "@/server/services/channel-access-service";
import { getThumbnailDelivery } from "@/server/thumbnail-storage";
import { canAccessThumbnail } from "@/server/thumbnail-authorization";

const ParamsSchema = z.object({
	clipId: z.string().regex(/^[a-f0-9]{32}$/i),
	size: z.enum(["small", "large"]),
});

function notFound() {
	return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
}

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ clipId: string; size: string }> }
) {
	const parsed = ParamsSchema.safeParse(await params);
	if (!parsed.success) return notFound();

	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	const limit = await rateLimit(
		`thumbnail:${auth.discordUserId}`,
		600,
		"1 m"
	);
	if (!limit.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	const scope = await DataService.getThumbnailAccessScope(
		parsed.data.clipId,
		parsed.data.size
	);
	if (!scope || scope.message_deleted_at || scope.channel_deleted_at)
		return notFound();

	const discordGuild = auth.userGuilds.find(
		(guild) => guild.id === scope.guild_id
	);
	if (!discordGuild) return notFound();

	const guild = await DataService.getSingleGuildById(scope.guild_id);
	if (!guild) return notFound();
	const isGuildOwner = guild.owner_id === auth.discordUserId;
	const channels =
		(await DataService.getChannelsByGuildId(scope.guild_id)) ?? [];
	if (!channels.some((channel) => channel.id === scope.channel_id))
		return notFound();

	const access = await resolveAccessibleChannelIds(
		scope.guild_id,
		auth.discordUserId,
		isGuildOwner,
		channels
	);
	if (
		access.channelIds !== undefined &&
		!access.channelIds.includes(scope.channel_id)
	) {
		return notFound();
	}

	if (!canAccessThumbnail(scope, auth.discordUserId, isGuildOwner)) {
		return notFound();
	}

	try {
		const delivery = await getThumbnailDelivery(scope.storage_path);
		if (!delivery) return notFound();
		if (delivery.kind === "redirect") {
			return NextResponse.redirect(delivery.url, {
				status: 302,
				headers: { "Cache-Control": "private, no-store" },
			});
		}
		const body = new Blob([delivery.body as BlobPart], {
			type: scope.mime_type || "image/webp",
		});
		return new NextResponse(body, {
			headers: {
				"Content-Type": scope.mime_type || "image/webp",
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		console.error(
			`Thumbnail delivery failed for clip ${parsed.data.clipId}:`,
			error instanceof Error ? error.message : "unknown error"
		);
		return NextResponse.json(
			{ error: "Failed to load thumbnail" },
			{ status: 503 }
		);
	}
}
