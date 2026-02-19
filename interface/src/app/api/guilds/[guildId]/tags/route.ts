import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess, canManageGuild } from "@/server/middleware/auth";
import * as db from "@/server/db/queries/tags";
import { ClipMapper } from "@/server/mappers/clip-mapper";
import { z } from "zod";
import { randomUUID } from "crypto";

// Validation schema for creating a tag
const createTagSchema = z.object({
	name: z.string().min(1).max(64, "Tag name is too long"),
	color: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
		.optional()
		.nullable(),
});

function slugify(text: string): string {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-") // Replace spaces with -
		.replace(/[^\w\-]+/g, "") // Remove all non-word chars
		.replace(/\-\-+/g, "-") // Replace multiple - with single -
		.replace(/^-+/, "") // Trim - from start of text
		.replace(/-+$/, ""); // Trim - from end of text
}

/**
 * GET /api/guilds/[guildId]/tags
 *
 * Get all tags for a guild.
 * Permission: Authenticated user with access to the guild
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;
	const auth = await requireGuildAccess(req, guildId);

	if (auth instanceof NextResponse) return auth;

	try {
		const tags = await db.getServerTags(guildId);

		return NextResponse.json(tags.map(ClipMapper.toTag));
	} catch (error) {
		console.error("Failed to fetch guild tags:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/guilds/[guildId]/tags
 *
 * Create a new tag for a guild.
 * Permission: Guild Manager (Admin or Manage Guild) or Owner
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string }> }
) {
	const { guildId } = await params;
	const auth = await requireGuildAccess(req, guildId);

	if (auth instanceof NextResponse) return auth;

	// Check permissions
	if (!auth.isOwner && !canManageGuild(auth.discordGuild)) {
		return NextResponse.json(
			{
				error: "You do not have permission to manage tags in this guild",
			},
			{ status: 403 }
		);
	}

	try {
		const body = await req.json();
		const validation = createTagSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.issues[0].message },
				{ status: 400 }
			);
		}

		const { name, color } = validation.data;
		const slug = slugify(name);

		if (!slug) {
			return NextResponse.json(
				{ error: "Invalid tag name, cannot generate slug" },
				{ status: 400 }
			);
		}

		if (slug.length > 32) {
			return NextResponse.json(
				{ error: "Tag name is too long" },
				{ status: 400 }
			);
		}

		// Check if tag with slug already exists
		// db.createServerTag will throw or fail if unique constraint violated?
		// We should probably check or handle error.
		// For now, let's try to insert.

		const newTag = await db.createServerTag({
			id: randomUUID(),
			guild_id: guildId,
			name,
			slug,
			color: color || null,
			created_by_user_id: auth.discordUserId,
			is_active: true,
			created_at: new Date(),
		});

		return NextResponse.json(ClipMapper.toTag(newTag));
	} catch (error: any) {
		console.error("Failed to create tag:", error);
		// Check for unique constraint violation (Postgres error code 23505)
		if (error.code === "23505") {
			return NextResponse.json(
				{ error: "A tag with this name already exists" },
				{ status: 409 }
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
