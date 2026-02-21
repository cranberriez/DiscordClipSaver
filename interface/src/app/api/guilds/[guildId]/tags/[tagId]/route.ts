import { NextRequest, NextResponse } from "next/server";
import { requireGuildAccess, canManageGuild } from "@/server/middleware/auth";
import * as db from "@/server/db/queries/tags";
import { z } from "zod";
import { rateLimit } from "@/server/rate-limit";

const updateTagSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(64, "Name must be less than 64 characters")
		.trim()
		.optional(),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (must be #RRGGBB)")
		.optional(),
	is_active: z.boolean().optional(),
});

/**
 * DELETE /api/guilds/[guildId]/tags/[tagId]
 *
 * Delete (or soft delete) a tag.
 * Permission: Guild Manager or Owner
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string; tagId: string }> }
) {
	const { guildId, tagId } = await params;
	const auth = await requireGuildAccess(req, guildId);

	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`manage_tags:${auth.discordUserId}`,
		30,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

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
		// Verify the tag belongs to the guild
		const tag = await db.getServerTagById(tagId);
		if (!tag) {
			return NextResponse.json(
				{ error: "Tag not found" },
				{ status: 404 }
			);
		}

		if (tag.guild_id !== guildId) {
			return NextResponse.json(
				{ error: "Tag does not belong to this guild" },
				{ status: 403 }
			);
		}

		const success = await db.deleteServerTag(tagId);

		if (!success) {
			return NextResponse.json(
				{ error: "Failed to delete tag" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to delete tag:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

/**
 * PATCH /api/guilds/[guildId]/tags/[tagId]
 *
 * Update a tag.
 * Permission: Guild Manager or Owner
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ guildId: string; tagId: string }> }
) {
	const { guildId, tagId } = await params;
	const auth = await requireGuildAccess(req, guildId);

	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 30 requests per minute
	const limitResult = await rateLimit(
		`manage_tags:${auth.discordUserId}`,
		30,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

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

		// Validate input with Zod
		const validation = updateTagSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.format(),
				},
				{ status: 400 }
			);
		}

		const { name, color, is_active } = validation.data;

		// Verify the tag belongs to the guild
		const tag = await db.getServerTagById(tagId);
		if (!tag) {
			return NextResponse.json(
				{ error: "Tag not found" },
				{ status: 404 }
			);
		}

		if (tag.guild_id !== guildId) {
			return NextResponse.json(
				{ error: "Tag does not belong to this guild" },
				{ status: 403 }
			);
		}

		const updateData: any = {};
		if (name !== undefined) {
			updateData.name = name;
			// Update slug if name changes
			updateData.slug = name
				.toString()
				.toLowerCase()
				.trim()
				.replace(/\s+/g, "-")
				.replace(/[^\w\-]+/g, "")
				.replace(/\-\-+/g, "-")
				.replace(/^-+/, "")
				.replace(/-+$/, "");
		}
		if (color !== undefined) {
			updateData.color = color;
		}
		if (is_active !== undefined) {
			updateData.is_active = is_active;
		}

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json(tag); // No changes
		}

		const updatedTag = await db.updateServerTag(tagId, updateData);

		if (!updatedTag) {
			return NextResponse.json(
				{ error: "Failed to update tag" },
				{ status: 500 }
			);
		}

		return NextResponse.json(updatedTag);
	} catch (error) {
		console.error("Failed to update tag:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
