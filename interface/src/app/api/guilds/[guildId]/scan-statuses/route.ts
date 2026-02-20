/**
 * API route to get scan statuses for all channels in a guild
 * Returns only scan statuses (not channels)
 * Requires guild ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { DataService } from "@/server/services/data-service";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;

	// Verify authentication and ownership
	const auth = await requireGuildAccess(req, guildId, true);
	if (auth instanceof NextResponse) return auth;

	try {
		// Returns only scan statuses for channels that have been scanned
		const statuses = await DataService.getScanStatusesByGuildId(guildId);

		return NextResponse.json(statuses);
	} catch (error) {
		console.error("Failed to fetch scan statuses:", error);
		return NextResponse.json(
			{ error: "Failed to fetch scan statuses" },
			{ status: 500 }
		);
	}
}
