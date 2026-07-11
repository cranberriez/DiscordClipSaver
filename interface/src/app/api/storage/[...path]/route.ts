import { NextResponse } from "next/server";

// Raw storage paths are intentionally no longer a public request contract.
// Keeping this fail-closed route prevents old clients from browsing or probing
// guild/channel folder structures during the migration.
export async function GET() {
	return NextResponse.json({ error: "File not found" }, { status: 404 });
}
