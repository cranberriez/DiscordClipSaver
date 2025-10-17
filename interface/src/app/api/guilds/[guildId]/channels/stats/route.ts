import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess } from "@/lib/middleware/auth";
import { db } from "@/lib/db";

/**
 * GET /api/guilds/[guildId]/channels/stats
 *
 * Fetch all channels for a guild with clip counts.
 * This endpoint is designed for TanStack Query caching.
 *
 * Requires guild access (not necessarily ownership for read).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    // Verify authentication and guild access
    const auth = await requireGuildAccess(req, guildId);
    if (auth instanceof NextResponse) return auth;

    // Fetch channels with clip counts
    const channelsRaw = await db
        .selectFrom("channel")
        .select(eb => [
            "channel.id",
            "channel.name",
            "channel.position",
            "channel.type",
            eb
                .selectFrom("clip")
                .select(eb2 => eb2.fn.countAll<string>().as("count"))
                .whereRef("clip.channel_id", "=", "channel.id")
                .as("clip_count"),
        ])
        .where("channel.guild_id", "=", guildId)
        .where("channel.deleted_at", "is", null)
        .orderBy("channel.name", "asc")
        .execute();

    // Convert clip_count from string to number
    const channels = channelsRaw.map(channel => ({
        id: channel.id,
        name: channel.name,
        position: channel.position,
        type: channel.type,
        clip_count: parseInt(channel.clip_count || "0", 10),
    }));

    return NextResponse.json(channels);
}
