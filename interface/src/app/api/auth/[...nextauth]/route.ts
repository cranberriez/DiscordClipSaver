import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";

import { upsertUser } from "@/server/db";

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

				// Keep the provider access token server-only on the JWT
				if (account?.access_token) {
					(
						token as typeof token & { accessToken?: string }
					).accessToken = account.access_token;
				}
				return token;
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
