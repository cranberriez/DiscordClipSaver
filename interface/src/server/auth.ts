import "server-only";
// Server-only auth helpers for NextAuth + Discord
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserByDiscordId } from "@/server/db";

export type AuthInfo = {
    session: Session;
    discordUserId: string;
    accessToken?: string;
};

export async function getAuthInfo(req?: NextRequest): Promise<AuthInfo> {
    // console.log("[getAuthInfo] Getting session...");
    const session = await getServerSession(authOptions);
    // console.log("[getAuthInfo] Session:", session ? "Found" : "Null", "User ID:", session?.user?.id);

    if (!session?.user?.id) {
        console.error("[getAuthInfo] No session or user ID found");
        throw new Error("Unauthorized");
    }

    let accessToken: string | undefined;
    if (req) {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });
        // console.log("[getAuthInfo] Token found:", !!token, "Has AccessToken:", !!(token as any)?.accessToken);
        accessToken = (token as typeof token & { accessToken?: string })
            ?.accessToken;
    } else {
        console.warn(
            "[getAuthInfo] No request object passed, cannot retrieve access token from JWT"
        );
    }

    if (req && !accessToken) {
        console.error("[getAuthInfo] Failed to retrieve access token from JWT");
    }

    return { session, discordUserId: session.user.id as string, accessToken };
}

export async function tryGetAuthInfo(
    req?: NextRequest
): Promise<AuthInfo | null> {
    try {
        return await getAuthInfo(req);
    } catch {
        return null;
    }
}

export async function requireDbUser(req?: NextRequest) {
    const info = await getAuthInfo(req);
    const dbUser = await getUserByDiscordId(info.discordUserId);
    return { ...info, dbUser };
}
