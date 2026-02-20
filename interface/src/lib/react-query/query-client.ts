import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Get a QueryClient instance for server-side use.
 *
 * This uses React's cache() to ensure we get the same instance
 * across the entire server render, but a fresh instance for each request.
 *
 * Use this in Server Components for prefetching data.
 */
export const getQueryClient = cache(
	() =>
		new QueryClient({
			defaultOptions: {
				queries: {
					// Server-side queries should not refetch
					staleTime: Infinity,
				},
			},
		})
);
