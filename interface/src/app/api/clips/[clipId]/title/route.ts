import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/middleware/auth";
import { getDb } from "@/server/db";
import { PermissionService } from "@/server/services/permission-service";

/**
 * PATCH /api/clips/[clipId]/title
 *
 * Update clip title.
 * Permission: Clip Owner OR Guild Owner OR System Admin
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ clipId: string }> }
) {
	const { clipId } = await params;
	const auth = await requireAuth(req);

	if (auth instanceof NextResponse) return auth;

	try {
		const body = await req.json();
		let { title } = body;

		// Validation
		if (typeof title !== "string") {
			return NextResponse.json(
				{ error: "Title must be a string" },
				{ status: 400 }
			);
		}

		title = title.trim();

		if (title.length < 2 || title.length > 254) {
			return NextResponse.json(
				{ error: "Title must be between 2 and 254 characters" },
				{ status: 400 }
			);
		}

		// Check Permissions
		const permResult = await PermissionService.checkClipPermission(
			clipId,
			auth.discordUserId,
			["clip_owner", "guild_owner", "system_admin"]
		);

		if (!permResult.success) {
			return NextResponse.json(
				{ error: permResult.error },
				{ status: permResult.status || 403 }
			);
		}

		// Update title
		await getDb()
			.updateTable("clip")
			.set({ title })
			.where("id", "=", clipId)
			.execute();

		return NextResponse.json({ success: true, title });
	} catch (error) {
		console.error("Failed to update clip title:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
