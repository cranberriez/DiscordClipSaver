import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js Middleware
 *
 * Runs on Edge Runtime before route handlers.
 * Provides fast authentication checks for all API routes.
 *
 * This is the FIRST line of defense - blocks unauthenticated requests
 * before they even reach the API route handlers.
 */

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if this is an API route that requires authentication
    if (pathname.startsWith("/api/")) {
        // Exclude public routes (auth callbacks, webhooks, etc.)
        const publicRoutes = [
            "/api/auth/", // NextAuth routes
            // Add other public routes here if needed
            // '/api/webhooks/',
            "/api/storage/",
            "/api/discord/bot/claim",
        ];

        const isPublicRoute = publicRoutes.some(route =>
            pathname.startsWith(route)
        );

        if (!isPublicRoute) {
            // Check authentication
            const token = await getToken({
                req: request,
                secret: process.env.NEXTAUTH_SECRET,
            });

            if (!token) {
                // No valid session - reject immediately
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }

            // User is authenticated - continue to route handler
            // Route handler will do more granular checks (guild access, ownership, etc.)
        }
    }

    return NextResponse.next();
}

/**
 * Matcher Configuration
 *
 * Specifies which routes this middleware applies to.
 * Using matcher is more efficient than checking pathname in the middleware.
 */
export const config = {
    matcher: [
        /*
         * Match all API routes except:
         * - NextAuth routes (/api/auth/*)
         * - Static files
         * - _next internal routes
         */
        "/api/((?!auth).*)",
    ],
};
