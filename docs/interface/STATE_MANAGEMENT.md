# State Management with TanStack Query

## Overview

The interface uses **TanStack Query** for server state management, providing automatic caching, background refetching, and optimistic updates.

## Why TanStack Query?

### Problems It Solves
1. **Cache invalidation** - Automatic
2. **Stale data** - Built-in stale-while-revalidate
3. **Request deduplication** - Multiple components, one request
4. **Background refetching** - Keep data fresh
5. **Optimistic updates** - Instant UI feedback
6. **Loading/error states** - Automatic

### vs. Other Solutions

| Feature | TanStack Query | Zustand | Redux | Context |
|---------|----------------|---------|-------|---------|
| Server state | ✅ Excellent | ⚠️ Manual | ⚠️ Manual | ❌ Poor |
| Caching | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ None |
| Refetching | ✅ Automatic | ❌ Manual | ❌ Manual | ❌ None |
| Optimistic updates | ✅ Built-in | ✅ Good | ✅ Good | ⚠️ Manual |
| DevTools | ✅ Excellent | ✅ Good | ✅ Excellent | ❌ None |

## Setup

### Provider Configuration

```typescript
// lib/providers/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          gcTime: 5 * 60 * 1000, // 5 minutes
          refetchOnWindowFocus: false,
          retry: 1,
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
```

### Root Layout

```typescript
// app/layout.tsx
import { Providers } from '@/lib/providers/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## Query Hooks

### Basic Query Pattern

```typescript
// lib/hooks/queries/useGuilds.ts
'use client';

import { useQuery } from '@tanstack/react-query';

export function useGuilds() {
  return useQuery({
    queryKey: ['guilds'],
    queryFn: async () => {
      const res = await fetch('/api/discord/user/guilds?includeDb=1');
      if (!res.ok) throw new Error('Failed to fetch guilds');
      return res.json();
    },
  });
}
```

### Usage in Component

```typescript
'use client';

import { useGuilds } from '@/lib/hooks/queries/useGuilds';

export function GuildList() {
  const { data, isLoading, error } = useGuilds();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data.guilds.map(guild => (
        <li key={guild.id}>{guild.name}</li>
      ))}
    </ul>
  );
}
```

## Query Keys

### Query Key Factory Pattern

```typescript
// lib/hooks/queries/useGuilds.ts
export const guildKeys = {
  all: ['guilds'] as const,
  lists: () => [...guildKeys.all, 'list'] as const,
  list: (filters?: any) => [...guildKeys.lists(), filters] as const,
  details: () => [...guildKeys.all, 'detail'] as const,
  detail: (id: string) => [...guildKeys.details(), id] as const,
  channels: (id: string) => [...guildKeys.detail(id), 'channels'] as const,
  scanStatuses: (id: string) => [...guildKeys.detail(id), 'scan-statuses'] as const,
};
```

### Benefits
- Consistent key structure
- Easy invalidation
- Type-safe
- Hierarchical organization

## Mutations

### Basic Mutation

```typescript
// lib/hooks/queries/useGuilds.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useToggleScanning(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(`/api/guilds/${guildId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle scanning');
      return res.json();
    },
    
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: guildKeys.detail(guildId) 
      });
    },
  });
}
```

### Usage in Component

```typescript
'use client';

import { useToggleScanning } from '@/lib/hooks/queries/useGuilds';

export function GuildHeader({ guild }) {
  const toggleMutation = useToggleScanning(guild.id);
  
  const handleToggle = () => {
    toggleMutation.mutate(!guild.message_scan_enabled);
  };
  
  return (
    <button 
      onClick={handleToggle}
      disabled={toggleMutation.isPending}
    >
      {guild.message_scan_enabled ? 'Disable' : 'Enable'} Scanning
    </button>
  );
}
```

## Optimistic Updates

### Pattern

```typescript
export function useToggleScanning(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      // API call
    },
    
    // Optimistic update
    onMutate: async (enabled) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: guildKeys.detail(guildId) 
      });

      // Snapshot previous value
      const previousGuild = queryClient.getQueryData(
        guildKeys.detail(guildId)
      );

      // Optimistically update
      queryClient.setQueryData(
        guildKeys.detail(guildId), 
        (old: any) => ({
          ...old,
          message_scan_enabled: enabled,
        })
      );

      return { previousGuild };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousGuild) {
        queryClient.setQueryData(
          guildKeys.detail(guildId),
          context.previousGuild
        );
      }
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: guildKeys.detail(guildId) 
      });
    },
  });
}
```

### Result
- UI updates instantly
- Rolls back on error
- Refetches to ensure consistency

## Automatic Polling

### Smart Polling Based on Data

```typescript
export function useScanStatuses(guildId: string) {
  return useQuery({
    queryKey: guildKeys.scanStatuses(guildId),
    queryFn: async () => {
      const res = await fetch(`/api/guilds/${guildId}/scan-statuses`);
      return res.json();
    },
    refetchInterval: (query) => {
      // Poll every 5s if any scans are running
      const data = query.state.data as any;
      const hasRunningScans = data?.statuses?.some(
        (s: any) => s.status === 'RUNNING' || s.status === 'PENDING'
      );
      return hasRunningScans ? 5000 : false;
    },
  });
}
```

### Result
- Polls only when needed
- Stops polling when scans complete
- No manual interval management

## Initial Data from Server

### Server Component Prefetch

```typescript
// app/dashboard/[guildId]/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { guildKeys } from '@/lib/hooks/queries/useGuilds';

export default async function GuildPage({ params }) {
  const queryClient = getQueryClient();
  const { guildId } = await params;

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: guildKeys.detail(guildId),
    queryFn: async () => {
      const guild = await getSingleGuildById(guildId);
      return { guild };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GuildPageClient guildId={guildId} />
    </HydrationBoundary>
  );
}
```

### Client Component

```typescript
// app/dashboard/[guildId]/GuildPageClient.tsx
'use client';

import { useGuild } from '@/lib/hooks/queries/useGuilds';

export function GuildPageClient({ guildId }) {
  // Uses server-prefetched data, no loading state!
  const { data } = useGuild(guildId);
  
  return <div>{data.guild.name}</div>;
}
```

## Request Deduplication

### Automatic Deduplication

```typescript
// Multiple components call useGuild(guildId)
// Only ONE network request is made!

function Component1() {
  const { data } = useGuild('123'); // Request 1
}

function Component2() {
  const { data } = useGuild('123'); // Uses same request!
}

function Component3() {
  const { data } = useGuild('123'); // Uses same request!
}
```

## Cache Invalidation

### Invalidate Specific Query

```typescript
queryClient.invalidateQueries({ 
  queryKey: guildKeys.detail(guildId) 
});
```

### Invalidate Multiple Queries

```typescript
// Invalidate all guild queries
queryClient.invalidateQueries({ 
  queryKey: guildKeys.all 
});

// Invalidate all guild details
queryClient.invalidateQueries({ 
  queryKey: guildKeys.details() 
});
```

### Invalidate on Mutation

```typescript
export function useStartScan(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // Start scan
    },
    onSuccess: () => {
      // Invalidate scan statuses to refetch
      queryClient.invalidateQueries({ 
        queryKey: guildKeys.scanStatuses(guildId) 
      });
    },
  });
}
```

## Error Handling

### Query Errors

```typescript
const { data, error, isLoading } = useGuilds();

if (isLoading) return <Loading />;
if (error) return <Error message={error.message} />;
return <GuildList guilds={data.guilds} />;
```

### Mutation Errors

```typescript
const mutation = useToggleScanning(guildId);

const handleToggle = async () => {
  try {
    await mutation.mutateAsync(true);
    toast.success('Scanning enabled');
  } catch (error) {
    toast.error('Failed to enable scanning');
  }
};
```

## DevTools

### Usage

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Features
- View all queries and their state
- Inspect query data
- Manually refetch queries
- View cache
- Time-travel debugging

## Best Practices

### 1. Use Query Keys Factory
```typescript
// ✅ Good
queryKey: guildKeys.detail(guildId)

// ❌ Bad
queryKey: ['guild', guildId]
```

### 2. Handle Loading and Error States
```typescript
// ✅ Good
if (isLoading) return <Loading />;
if (error) return <Error />;
return <Content data={data} />;

// ❌ Bad
return <Content data={data} />; // Crashes if data is undefined
```

### 3. Invalidate After Mutations
```typescript
// ✅ Good
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: guildKeys.detail(id) });
}

// ❌ Bad - stale data
onSuccess: () => {
  // No invalidation
}
```

### 4. Use Optimistic Updates for Better UX
```typescript
// ✅ Good - instant feedback
onMutate: async (newData) => {
  // Optimistically update
}

// ⚠️ Okay - but slower UX
onSuccess: () => {
  // Wait for server response
}
```

## Common Patterns

### Dependent Queries

```typescript
const { data: guild } = useGuild(guildId);
const { data: channels } = useChannels(guildId, {
  enabled: !!guild, // Only run if guild exists
});
```

### Pagination

```typescript
const [page, setPage] = useState(0);

const { data } = useQuery({
  queryKey: ['clips', page],
  queryFn: () => fetchClips(page),
  keepPreviousData: true, // Keep old data while fetching new
});
```

### Infinite Scroll

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
} = useInfiniteQuery({
  queryKey: ['clips'],
  queryFn: ({ pageParam = 0 }) => fetchClips(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Routes](./API_ROUTES.md)
- [TanStack Query Docs](https://tanstack.com/query/latest)
