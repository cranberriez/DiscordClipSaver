import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";

import { upsertUser } from "@/server/db";

type DiscordJWT = {
	discordUserId?: string;
	accessToken?: string;
	refreshToken?: string;
	accessTokenExpiresAt?: number;
	error?: "RefreshTokenError";
};

/**
 * Refresh the Discord access token using the stored refresh token.
 * Discord access tokens expire (~7 days) while sessions last 30 days;
 * without this, guild fetches start failing mid-session.
 */
async function refreshDiscordAccessToken<T extends DiscordJWT>(
	token: T
): Promise<T> {
	if (!token.refreshToken) {
		return { ...token, error: "RefreshTokenError" as const };
	}
	try {
		const response = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID ?? "",
				client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
				grant_type: "refresh_token",
				refresh_token: token.refreshToken,
			}),
		});
		const refreshed = await response.json();
		if (!response.ok) {
			throw refreshed;
		}
		return {
			...token,
			accessToken: refreshed.access_token,
			refreshToken: refreshed.refresh_token ?? token.refreshToken,
			accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
			error: undefined,
		};
	} catch (error) {
		console.error("Failed to refresh Discord access token:", error);
		return { ...token, error: "RefreshTokenError" as const };
	}
}

/**
 * Get the base URL for NextAuth callbacks.
 * In development, this allows dynamic URLs (localhost, local IP, etc.)
 * In production, uses NEXTAUTH_URL environment variable.
 */
function getAuthUrl(req?: Request): string {
	// Production: Always use NEXTAUTH_URL
	if (process.env.NODE_ENV === "production") {
		return process.env.NEXTAUTH_URL ?? "";
	}

	// Development: Use request headers if available for dynamic URLs
	if (req) {
		const host = req.headers.get("host");
		const protocol = req.headers.get("x-forwarded-proto") ?? "http";
		if (host) {
			return `${protocol}://${host}`;
		}
	}

	// Fallback to NEXTAUTH_URL
	return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function createAuthOptions(baseUrl?: string): NextAuthOptions {
	return {
		secret: process.env.NEXTAUTH_SECRET,
		session: {
			strategy: "jwt",
			maxAge: 30 * 24 * 60 * 60, // 30 days
		},
		jwt: {
			// Explicitly strict enforcement of JWE (encrypted JWTs)
			// This ensures that even if the cookie is stolen (unlikely via HttpOnly),
			// the content (including access_token) cannot be read without the server-side secret.
			// NextAuth v4 uses JWE by default, but we declare it here for security audit clarity.
		},
		providers: [
			DiscordProvider({
				clientId: process.env.DISCORD_CLIENT_ID ?? "",
				clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
				authorization: {
					params: { scope: "identify guilds" },
				},
			}),
		],
		...(baseUrl && { url: baseUrl }),
		callbacks: {
			async signIn({ user, account, profile }) {
				const discordProfile = profile as DiscordProfile | undefined;
				const discordUserId =
					(typeof discordProfile?.id === "string" &&
						discordProfile.id) ??
					account?.providerAccountId ??
					(typeof user.id === "string" ? user.id : undefined);

				if (!discordUserId) {
					return true;
				}

				try {
					await upsertUser({
						id: discordUserId,
						username: discordProfile?.username ?? user.name ?? "",
						discriminator: discordProfile?.discriminator ?? "",
						avatar_url: discordProfile?.avatar ?? user.image ?? "",
					});
				} catch (error) {
					console.error("Failed to upsert Discord user login", error);
				}

				return true;
			},
			async jwt({ token, account, profile }) {
				// Persist Discord user id in the JWT for stable server-side identity
				const discordProfile = profile as DiscordProfile | undefined;
				const discordUserId =
					(typeof discordProfile?.id === "string" &&
						discordProfile.id) ??
					account?.providerAccountId ??
					(typeof token.sub === "string" ? token.sub : undefined);

				if (discordUserId) {
					(
						token as typeof token & { discordUserId?: string }
					).discordUserId = discordUserId;
				}

				const t = token as typeof token & DiscordJWT;

				// Initial sign-in: persist tokens + expiry server-only on the JWT
				if (account?.access_token) {
					t.accessToken = account.access_token;
					t.refreshToken = account.refresh_token ?? t.refreshToken;
					// account.expires_at is epoch seconds
					t.accessTokenExpiresAt = account.expires_at
						? account.expires_at * 1000
						: Date.now() + 7 * 24 * 60 * 60 * 1000;
					t.error = undefined;
					return t;
				}

				// Token still valid (60s clock-skew buffer): keep it
				if (
					!t.accessTokenExpiresAt ||
					Date.now() < t.accessTokenExpiresAt - 60_000
				) {
					return t;
				}

				// Token expired: refresh it
				return refreshDiscordAccessToken(t);
			},
			async session({ session, token }) {
				if (session.user) {
					const discordUserId =
						(token as typeof token & { discordUserId?: string })
							.discordUserId ?? token.sub;
					if (discordUserId) {
						(
							session.user as typeof session.user & {
								id?: string;
							}
						).id = discordUserId as string;
					}
				}
				return session;
			},
			async redirect({ url, baseUrl }) {
				// Allows relative callback URLs
				if (url.startsWith("/")) return `${baseUrl}${url}`;
				// Allows callback URLs on the same origin
				else if (new URL(url).origin === baseUrl) return url;
				return baseUrl;
			},
		},
		pages: {
			signIn: "/login",
			error: "/error",
		},
	};
}

// Export static authOptions for getServerSession
export const authOptions = createAuthOptions();

// Create dynamic handlers that use request-specific authOptions
async function GET(
	req: Request,
	context: { params: Promise<{ nextauth: string[] }> }
) {
	// In development, create authOptions with dynamic URL
	const options =
		process.env.NODE_ENV === "development"
			? createAuthOptions(getAuthUrl(req))
			: authOptions;

	const handler = NextAuth(options);
	// Await params for Next.js 15+ compatibility
	const params = await context.params;
	return handler(req, { params });
}

async function POST(
	req: Request,
	context: { params: Promise<{ nextauth: string[] }> }
) {
	// In development, create authOptions with dynamic URL
	const options =
		process.env.NODE_ENV === "development"
			? createAuthOptions(getAuthUrl(req))
			: authOptions;

	const handler = NextAuth(options);
	// Await params for Next.js 15+ compatibility
	const params = await context.params;
	return handler(req, { params });
}

export { GET, POST };
