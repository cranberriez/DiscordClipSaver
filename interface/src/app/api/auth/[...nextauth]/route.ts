import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";

import { upsertUser } from "@/server/db";

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID ?? "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
            authorization: {
                params: { scope: "identify email guilds" },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            const discordProfile = profile as DiscordProfile | undefined;
            const discordUserId =
                (typeof discordProfile?.id === "string" && discordProfile.id) ??
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
                (typeof discordProfile?.id === "string" && discordProfile.id) ??
                account?.providerAccountId ??
                (typeof token.sub === "string" ? token.sub : undefined);

            if (discordUserId) {
                (
                    token as typeof token & { discordUserId?: string }
                ).discordUserId = discordUserId;
            }

            // Keep the provider access token server-only on the JWT
            if (account?.access_token) {
                (token as typeof token & { accessToken?: string }).accessToken =
                    account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const discordUserId =
                    (token as typeof token & { discordUserId?: string })
                        .discordUserId ?? token.sub;
                if (discordUserId) {
                    (session.user as typeof session.user & { id?: string }).id =
                        discordUserId as string;
                }
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            try {
                const target = new URL(url, baseUrl);
                const isSameOrigin = target.origin === baseUrl;
                if (isSameOrigin) {
                    if (
                        target.pathname === "/login" ||
                        target.pathname === "/"
                    ) {
                        return `${baseUrl}/clips`;
                    }
                    return target.toString();
                }
                return baseUrl;
            } catch {
                return baseUrl;
            }
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
