import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { DataService } from "@/server/services/data-service";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/rate-limit";
import { resolveAccessibleChannelIds } from "@/server/services/channel-access-service";
import {
	getThumbnailDelivery,
	thumbnailBrowserCacheControl,
} from "@/server/thumbnail-storage";
import { canAccessThumbnail } from "@/server/thumbnail-authorization";

const ParamsSchema = z.object({
	clipId: z.string().regex(/^[a-f0-9]{32}$/i),
	size: z.enum(["small", "large"]),
});

type ThumbnailRequestLog = {
	request_id: string;
	path: string;
	clip_id?: string;
	size?: string;
	user_id?: string;
	guild_id?: string;
	channel_id?: string;
	duration_ms: number;
	[key: string]: unknown;
};

function requestLogContext(
	req: NextRequest,
	startedAt: number,
	context: Omit<
		ThumbnailRequestLog,
		"request_id" | "path" | "duration_ms"
	> = {}
): ThumbnailRequestLog {
	return {
		request_id: req.headers.get("x-request-id") ?? crypto.randomUUID(),
		path: req.nextUrl.pathname,
		...context,
		duration_ms: Date.now() - startedAt,
	};
}

function notFound(reason: string, context: ThumbnailRequestLog) {
	console.warn(
		JSON.stringify({
			event: "thumbnail_not_found",
			reason,
			...context,
		})
	);
	return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
}

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ clipId: string; size: string }> }
) {
	const startedAt = Date.now();
	const rawParams = await params;
	const parsed = ParamsSchema.safeParse(rawParams);
	if (!parsed.success) {
		return notFound(
			"invalid_parameters",
			requestLogContext(req, startedAt, {
				clip_id: rawParams.clipId,
				size: rawParams.size,
				validation_issues: parsed.error.issues.map(
					(issue) => issue.message
				),
			})
		);
	}
	const requestContext = {
		clip_id: parsed.data.clipId,
		size: parsed.data.size,
	};

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
	if (!scope) {
		return notFound(
			"thumbnail_record_not_found",
			requestLogContext(req, startedAt, {
				...requestContext,
				user_id: auth.discordUserId,
			})
		);
	}
	const scopedContext = {
		...requestContext,
		user_id: auth.discordUserId,
		guild_id: scope.guild_id,
		channel_id: scope.channel_id,
	};
	if (scope.message_deleted_at) {
		return notFound(
			"message_deleted",
			requestLogContext(req, startedAt, scopedContext)
		);
	}
	if (scope.channel_deleted_at) {
		return notFound(
			"channel_deleted",
			requestLogContext(req, startedAt, scopedContext)
		);
	}

	const discordGuild = auth.userGuilds.find(
		(guild) => guild.id === scope.guild_id
	);
	if (!discordGuild) {
		return notFound(
			"user_not_in_guild",
			requestLogContext(req, startedAt, scopedContext)
		);
	}

	const guild = await DataService.getSingleGuildById(scope.guild_id);
	if (!guild) {
		return notFound(
			"guild_record_not_found",
			requestLogContext(req, startedAt, scopedContext)
		);
	}
	const isGuildOwner = guild.owner_id === auth.discordUserId;
	const channels =
		(await DataService.getChannelsByGuildId(scope.guild_id)) ?? [];
	if (!channels.some((channel) => channel.id === scope.channel_id)) {
		return notFound(
			"channel_record_not_found",
			requestLogContext(req, startedAt, scopedContext)
		);
	}

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
		return notFound(
			"channel_access_denied",
			requestLogContext(req, startedAt, {
				...scopedContext,
				permission_lookup_degraded: access.degraded,
			})
		);
	}

	if (!canAccessThumbnail(scope, auth.discordUserId, isGuildOwner)) {
		return notFound(
			"clip_visibility_denied",
			requestLogContext(req, startedAt, {
				...scopedContext,
				clip_visibility: scope.visibility,
				clip_archived: Boolean(scope.clip_deleted_at),
			})
		);
	}

	try {
		const delivery = await getThumbnailDelivery(scope.storage_path);
		if (!delivery) {
			return notFound(
				"storage_object_not_found",
				requestLogContext(req, startedAt, {
					...scopedContext,
					storage_type: (
						process.env.STORAGE_TYPE ?? "local"
					).toLowerCase(),
					storage_path: scope.storage_path,
					gcs_local_fallback_configured: Boolean(
						process.env.GCS_LOCAL_FALLBACK_PATH
					),
				})
			);
		}
		const cacheControl = thumbnailBrowserCacheControl();
		if (delivery.kind === "redirect") {
			return NextResponse.redirect(delivery.url, {
				status: 302,
				headers: { "Cache-Control": cacheControl },
			});
		}
		const body = new Blob([delivery.body as BlobPart], {
			type: scope.mime_type || "image/webp",
		});
		return new NextResponse(body, {
			headers: {
				"Content-Type": scope.mime_type || "image/webp",
				"Cache-Control": cacheControl,
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		console.error(
			JSON.stringify({
				event: "thumbnail_delivery_failed",
				...requestLogContext(req, startedAt, {
					...scopedContext,
					storage_type: (
						process.env.STORAGE_TYPE ?? "local"
					).toLowerCase(),
					storage_path: scope.storage_path,
					error:
						error instanceof Error
							? {
									name: error.name,
									message: error.message,
									stack: error.stack,
								}
							: String(error),
				}),
			})
		);
		return NextResponse.json(
			{ error: "Failed to load thumbnail" },
			{ status: 503 }
		);
	}
}
