import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { PermissionService } from "@/server/services/permission-service";
import * as db from "@/server/db/queries/tags";
import { z } from "zod";

// Validation schema
const manageTagsSchema = z.object({
	tags: z.array(z.string()),
});

/**
 * POST /api/clips/[clipId]/tags
 *
 * Add tags to a clip.
 * Permission: Clip Owner OR Guild Owner OR System Admin
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ clipId: string }> }
) {
	const { clipId } = await params;
	const auth = await requireAuth(req);

	if (auth instanceof NextResponse) return auth;

	try {
		const body = await req.json();
		const validation = manageTagsSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.issues[0].message },
				{ status: 400 }
			);
		}

		const { tags } = validation.data;

		if (tags.length === 0) {
			return NextResponse.json({ success: true, count: 0 });
		}

		// Check Permissions
		const permResult = await PermissionService.checkClipPermission(
			clipId,
			auth.discordUserId,
			["clip_owner", "guild_owner", "system_admin"]
		);

		if (!permResult.success || !permResult.clip) {
			return NextResponse.json(
				{ error: permResult.error },
				{ status: permResult.status || 403 }
			);
		}

		const guildId = permResult.clip.clip.guild_id;

		// Add tags
		// Using Promise.all to add them in parallel. Since the DB function handles ON CONFLICT DO NOTHING,
		// we don't need to check existence first.
		await Promise.all(
			tags.map((tagId) =>
				db.addTagToClip(guildId, clipId, tagId, auth.discordUserId)
			)
		);

		return NextResponse.json({ success: true, count: tags.length });
	} catch (error) {
		console.error("Failed to add tags to clip:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/clips/[clipId]/tags
 *
 * Remove tags from a clip.
 * Permission: Clip Owner OR Guild Owner OR System Admin
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ clipId: string }> }
) {
	const { clipId } = await params;
	const auth = await requireAuth(req);

	if (auth instanceof NextResponse) return auth;

	try {
		const body = await req.json();
		const validation = manageTagsSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.issues[0].message },
				{ status: 400 }
			);
		}

		const { tags } = validation.data;

		if (tags.length === 0) {
			return NextResponse.json({ success: true, count: 0 });
		}

		// Check Permissions
		const permResult = await PermissionService.checkClipPermission(
			clipId,
			auth.discordUserId,
			["clip_owner", "guild_owner", "system_admin"]
		);

		if (!permResult.success || !permResult.clip) {
			return NextResponse.json(
				{ error: permResult.error },
				{ status: permResult.status || 403 }
			);
		}

		const guildId = permResult.clip.clip.guild_id;

		// Remove tags
		await Promise.all(
			tags.map((tagId) => db.removeTagFromClip(guildId, clipId, tagId))
		);

		return NextResponse.json({ success: true, count: tags.length });
	} catch (error) {
		console.error("Failed to remove tags from clip:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
