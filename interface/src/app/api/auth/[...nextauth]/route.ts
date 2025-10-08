import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

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
		async jwt({ token, account }) {
			if (account?.access_token) {
				(token as typeof token & { accessToken?: string }).accessToken = account.access_token;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.sub) {
				(session.user as typeof session.user & { id?: string }).id = token.sub;
			}
			return session;
		},
	},
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
