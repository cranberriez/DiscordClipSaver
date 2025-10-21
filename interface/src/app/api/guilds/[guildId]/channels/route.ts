import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/server/middleware/auth";
import { filterChannelsByPermissions } from "@/server/middleware/channels";
import { DataService } from "@/server/services/data-service";

/**
 * GET /api/guilds/[guildId]/channels
 *
 * Get all channels for a guild that the user has access to.
 * Channels are filtered based on the user's Discord permissions.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and guild access
    const auth = await requireGuildAccess(req, guildId);
    if (auth instanceof NextResponse) return auth;

    // Get all channels for this guild
    try {
        const allChannels = await DataService.getChannelsByGuildId(guildId);

        if (!allChannels) {
            return NextResponse.json(
                { error: "Channels not found" },
                { status: 404 }
            );
        }

        // Filter channels based on user's Discord permissions
        const visibleChannels = filterChannelsByPermissions(
            allChannels,
            auth.discordGuild
        );

        return NextResponse.json(visibleChannels);
    } catch (error) {
        console.error("Failed to fetch channels:", error);
        return NextResponse.json(
            { error: "Failed to fetch channels" },
            { status: 500 }
        );
    }
}
