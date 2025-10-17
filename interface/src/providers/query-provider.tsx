'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Consider data fresh for 1 minute
                        staleTime: 60 * 1000,
                        // Keep unused data in cache for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // Don't refetch on window focus (can be annoying during dev)
                        refetchOnWindowFocus: false,
                        // Retry failed requests once
                        retry: (failureCount, error: any) => {
                            // Don't retry on auth errors
                            if (error?.status === 401 || error?.status === 403) {
                                return false;
                            }
                            return failureCount < 1;
                        },
                    },
                    mutations: {
                        // Global mutation error handling can go here
                        onError: (error: any) => {
                            console.error('Mutation error:', error);
                        },
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
