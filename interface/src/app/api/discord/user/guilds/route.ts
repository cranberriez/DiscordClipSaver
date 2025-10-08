import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
	const accessToken = (token as typeof token & { accessToken?: string })?.accessToken;
	if (!accessToken) return NextResponse.json({ error: "Missing Discord token" }, { status: 401 });

	const res = await fetch("https://discord.com/api/users/@me/guilds", {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});

	if (!res.ok) return NextResponse.json({ error: "Failed to fetch guilds" }, { status: res.status });

	return NextResponse.json(await res.json());
}
