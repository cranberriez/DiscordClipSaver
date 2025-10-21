import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * GET /api/storage/[...path]
 *
 * Serve files from the storage directory (thumbnails, etc.)
 * This allows the interface to serve files stored by the worker.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;

    // Join path segments
    const filePath = path.join("/");

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
        return NextResponse.json(
            { error: "File not found", path: fullPath },
            { status: 404 }
        );
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
