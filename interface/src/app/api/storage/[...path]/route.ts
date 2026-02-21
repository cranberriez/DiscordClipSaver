import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/rate-limit";

/**
 * GET /api/storage/[...path]
 *
 * Serve files from the storage directory (thumbnails, etc.)
 * This allows the interface to serve files stored by the worker.
 *
 * SECURED: Requires authentication and guild access verification.
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> }
) {
	const { path } = await params;

	// 1. Authentication Check
	const auth = await requireAuth(req);
	if (auth instanceof NextResponse) return auth;

	// Rate Limit: 600 requests per minute (high limit for assets like thumbnails)
	const limitResult = await rateLimit(
		`storage:${auth.discordUserId}`,
		600,
		"1 m"
	);
	if (!limitResult.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 }
		);
	}

	// Join path segments
	const filePath = path.join("/");

	// 2. Authorization Check (Guild Access)
	// Expecting paths like: thumbnails/guild_123456789/clip_abcdef.webp
	const guildIdMatch = filePath.match(/guild_(\d+)/);

	if (guildIdMatch) {
		const guildId = guildIdMatch[1];

		// Check if user has access to this guild
		// auth.userGuilds contains the Discord guilds the user is a member of
		const hasAccess = auth.userGuilds.some((g) => g.id === guildId);

		if (!hasAccess) {
			console.warn(
				`[Storage] Access denied for user ${auth.discordUserId} to guild ${guildId}`
			);
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
	} else {
		// If we can't determine the guild from the path, strictly block access
		// unless it's a known public asset (which shouldn't be here)
		console.warn(
			`[Storage] Could not determine guild ID from path: ${filePath}`
		);
		// For now, we block unknown paths to be safe.
		// If there are global assets, they should be whitelisted.
		return NextResponse.json(
			{ error: "Invalid resource path" },
			{ status: 403 }
		);
	}

	// Construct full path to storage directory
	// In Docker: /app/storage
	// In local dev: ./storage
	const storagePath =
		process.env.STORAGE_PATH || join(process.cwd(), "storage");
	const fullPath = join(storagePath, filePath);

	// console.log("Storage request:", {
	//     requestedPath: filePath,
	//     storagePath,
	//     fullPath,
	//     exists: existsSync(fullPath),
	// });

	// Security: Ensure the resolved path is within storage directory
	if (!fullPath.startsWith(storagePath)) {
		console.error("Path traversal attempt:", fullPath);
		return NextResponse.json({ error: "Invalid path" }, { status: 400 });
	}

	// Check if file exists
	if (!existsSync(fullPath)) {
		console.error("File not found:", fullPath);
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	try {
		// Read file
		const fileBuffer = await readFile(fullPath);

		// Determine content type based on extension
		const ext = filePath.split(".").pop()?.toLowerCase();
		let contentType = "application/octet-stream";

		if (ext === "webp") {
			contentType = "image/webp";
		} else if (ext === "jpg" || ext === "jpeg") {
			contentType = "image/jpeg";
		} else if (ext === "png") {
			contentType = "image/png";
		} else if (ext === "mp4") {
			contentType = "video/mp4";
		} else if (ext === "webm") {
			contentType = "video/webm";
		}

		// Convert Buffer to Uint8Array for Blob compatibility
		const uint8Array = new Uint8Array(fileBuffer);
		const blob = new Blob([uint8Array], { type: contentType });

		// Return file with appropriate headers
		return new NextResponse(blob, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch (error) {
		console.error("Error serving file:", error);
		return NextResponse.json(
			{ error: "Failed to serve file" },
			{ status: 500 }
		);
	}
}
