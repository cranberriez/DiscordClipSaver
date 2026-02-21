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

	// Define protected routes
	const isApiRoute = pathname.startsWith("/api/");
	const isProtectedRoute =
		pathname.startsWith("/clips") ||
		pathname.startsWith("/dashboard") ||
		pathname.startsWith("/me") ||
		isApiRoute;

	if (isProtectedRoute) {
		// Exclude public API routes (auth callbacks, webhooks, etc.)
		const publicApiRoutes = [
			"/api/auth/", // NextAuth routes
			"/api/discord/bot/claim",
		];

		const isPublicRoute =
			isApiRoute &&
			publicApiRoutes.some((route) => pathname.startsWith(route));

		if (!isPublicRoute) {
			// Check authentication
			const token = await getToken({
				req: request,
				secret: process.env.NEXTAUTH_SECRET,
			});

			// Check if token exists AND has an accessToken
			// If the session exists but lacks an accessToken (e.g. lost in JWT callback),
			// we must treat it as unauthorized to prevent API 401 loops.
			const hasAccessToken = !!(token as any)?.accessToken;

			if (!token || !hasAccessToken) {
				if (isApiRoute) {
					console.log(
						"[Middleware] No valid token/accessToken for API request to:",
						pathname
					);
					return NextResponse.json(
						{ error: "Unauthorized" },
						{ status: 401 }
					);
				} else {
					console.log(
						"[Middleware] No valid token/accessToken for page request to:",
						pathname
					);
					const url = new URL("/login", request.url);
					url.searchParams.set("callbackUrl", pathname);
					return NextResponse.redirect(url);
				}
			}

			// User is authenticated - continue to route handler
			// Route handler will do more granular checks (guild access, ownership, etc.)
		}
	}

	// CSRF Protection & Body Size Limit
	// Verify Origin header for state-changing requests to API routes
	if (
		isApiRoute &&
		["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
	) {
		// 1. Body Size Limit (1MB)
		const contentLength = request.headers.get("content-length");
		if (contentLength && parseInt(contentLength) > 1024 * 1024) {
			return NextResponse.json(
				{ error: "Payload too large. Limit is 1MB." },
				{ status: 413 }
			);
		}

		// 2. CSRF / Origin Check
		const origin = request.headers.get("origin");
		const host = request.headers.get("host");

		// If Origin is present, it must match the Host
		// (Browsers always send Origin for CORS/POST requests)
		if (origin && host) {
			try {
				const originUrl = new URL(origin);
				if (originUrl.host !== host) {
					console.warn(
						`[Middleware] CSRF Blocked: Origin ${origin} does not match Host ${host}`
					);
					return NextResponse.json(
						{ error: "Invalid Origin" },
						{ status: 403 }
					);
				}
			} catch {
				// Invalid Origin URL
				return NextResponse.json(
					{ error: "Invalid Origin Header" },
					{ status: 403 }
				);
			}
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
		 * - NextAuth routes (/api/auth/*) handled in logic
		 * - Static files
		 * - _next internal routes
		 */
		"/api/:path*",
		"/clips/:path*",
		"/dashboard/:path*",
		"/me/:path*",
	],
};
