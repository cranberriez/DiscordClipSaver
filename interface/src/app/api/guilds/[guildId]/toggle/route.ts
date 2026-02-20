import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { updateGuildMessageScanEnabled } from "@/server/db";
import { ToggleSchema } from "@/lib/schema/guild-toggle.schema";

/**
 * POST /api/guilds/[guildId]/toggle
 *
 * Toggle message scanning for the entire guild.
 * Requires guild ownership.
 */
// TODO: Use data service
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON in request body" },
			{ status: 400 }
		);
	}

	const validation = ToggleSchema.safeParse(body);
	if (!validation.success) {
		return NextResponse.json(
			{
				error: "Validation failed",
				details: validation.error.issues,
			},
			{ status: 400 }
		);
	}

	const { enabled } = validation.data;

	// Update guild message_scan_enabled
	try {
		await updateGuildMessageScanEnabled(guildId, enabled);

		return NextResponse.json({
			success: true,
			enabled,
		});
	} catch (error) {
		console.error("Failed to toggle guild:", error);
		return NextResponse.json(
			{ error: "Failed to update guild" },
			{ status: 500 }
		);
	}
}
