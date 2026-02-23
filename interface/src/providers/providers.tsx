"use client";

import { ThemeProvider } from "next-themes";
import { QueryProvider } from "./query-provider";
import { SessionProvider } from "next-auth/react";

/**
 * Combined Providers Component
 *
 * Wraps the app with all necessary client-side providers.
 * This must be a Client Component to use SessionProvider and QueryProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
		>
			<SessionProvider>
				<QueryProvider>{children}</QueryProvider>
			</SessionProvider>
		</ThemeProvider>
	);
}
