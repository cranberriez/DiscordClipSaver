import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { getDb } from "@/server/db";
import { PermissionService } from "@/server/services/permission-service";
import { rateLimit } from "@/server/rate-limit";

/**
 * PATCH /api/clips/[clipId]/visibility
 *
 * Update clip visibility.
 * Permission: Clip Owner OR Guild Owner
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ clipId: string }> }
) {
	const { clipId } = await params;
	const auth = await requireAuth(req);

	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 10 requests per minute
	const limitResult = await rateLimit(
		`update_clip_visibility:${auth.discordUserId}`,
		10,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	try {
		const body = await req.json();
		const { visibility } = body;

		if (!["PUBLIC", "UNLISTED", "PRIVATE"].includes(visibility)) {
			return NextResponse.json(
				{ error: "Invalid visibility option" },
				{ status: 400 }
			);
		}

		// Check Permissions
		const permResult = await PermissionService.checkClipPermission(
			clipId,
			auth,
			["clip_owner", "guild_owner"]
		);

		if (!permResult.success) {
			return NextResponse.json(
				{ error: permResult.error },
				{ status: permResult.status || 403 }
			);
		}

		// Update visibility
		await getDb()
			.updateTable("clip")
			.set({ visibility })
			.where("id", "=", clipId)
			.execute();

		return NextResponse.json({ success: true, visibility });
	} catch (error) {
		console.error("Failed to update clip visibility:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
