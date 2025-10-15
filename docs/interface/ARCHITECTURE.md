# Next.js Interface Architecture

## Overview

The Next.js interface is a modern web application built with Next.js 15, TypeScript, and TanStack Query for state management.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Kysely
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js (Discord OAuth)
- **Validation**: Zod

## Directory Structure

```
interface/src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth routes
│   │   ├── discord/              # Discord API proxies
│   │   └── guilds/               # Guild management
│   ├── dashboard/                # Main dashboard
│   │   ├── [...guildId]/         # Guild detail pages
│   │   └── GuildList.tsx         # Guild list component
│   ├── install/                  # Bot installation flow
│   ├── _components/              # Shared components
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
│
├── lib/                          # Shared utilities
│   ├── actions/                  # Server actions
│   ├── api/                      # API client utilities
│   ├── db/                       # Database layer
│   │   ├── queries/              # Database queries
│   │   ├── schemas/              # Kysely schemas
│   │   └── index.ts              # Public exports
│   ├── discord/                  # Discord utilities
│   ├── hooks/                    # React hooks
│   ├── middleware/               # Auth middleware
│   ├── providers/                # React providers
│   ├── redis/                    # Redis client
│   ├── settings/                 # Settings builder
│   └── validation/               # Zod schemas
│
└── middleware.ts                 # Edge middleware
```

## Layered Architecture

### Layer 1: API Routes (HTTP)
- Handle HTTP requests/responses
- Validate input with Zod
- Check authentication/authorization
- Call query functions (no direct DB access)

### Layer 2: Query Functions (Database)
- All database operations
- Type-safe Kysely queries
- Return typed results
- No HTTP concerns

### Layer 3: Database (PostgreSQL)
- Data storage
- Relationships
- Constraints

## Data Flow

### Read Operations
```
Client Component
  ↓ (TanStack Query)
API Route (/api/guilds/[guildId])
  ↓ (calls)
Query Function (getSingleGuildById)
  ↓ (Kysely)
PostgreSQL Database
```

### Write Operations
```
Client Component
  ↓ (Server Action or Mutation)
API Route (POST /api/guilds/[guildId]/toggle)
  ↓ (validates with Zod)
  ↓ (checks auth)
Query Function (updateGuildMessageScanEnabled)
  ↓ (Kysely)
PostgreSQL Database
  ↓ (invalidates cache)
TanStack Query refetches
```

## Key Patterns

### 1. Server Components for Initial Data
```typescript
// page.tsx (Server Component)
export default async function GuildPage({ params }) {
  const { guildId } = await params;
  const guild = await getSingleGuildById(guildId);
  
  return <GuildPageClient guild={guild} />;
}
```

### 2. Client Components for Interactivity
```typescript
// GuildPageClient.tsx (Client Component)
'use client';

export function GuildPageClient({ guild }) {
  const { data, refetch } = useGuild(guild.id, guild);
  // Interactive UI with TanStack Query
}
```

### 3. API Routes Call Query Functions
```typescript
// app/api/guilds/[guildId]/route.ts
export async function GET(req, { params }) {
  const auth = await requireGuildAccess(req, params.guildId);
  if (auth instanceof NextResponse) return auth;
  
  const guild = await getSingleGuildById(params.guildId);
  return NextResponse.json({ guild });
}
```

### 4. Query Functions Handle Database
```typescript
// lib/db/queries/guilds.ts
export async function getSingleGuildById(id: string) {
  return await getDb()
    .selectFrom('guild')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
}
```

## Authentication Flow

1. User clicks "Login with Discord"
2. NextAuth redirects to Discord OAuth
3. Discord redirects back with code
4. NextAuth exchanges code for token
5. Session created with Discord user info
6. Middleware checks session on API routes
7. Route handlers verify guild access

## Authorization Levels

See [MIDDLEWARE.md](./MIDDLEWARE.md) for detailed authorization rules.

## State Management

### TanStack Query for Server State
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

### React State for UI State
- Form inputs
- Modal open/closed
- Active tab
- Local preferences

## File Naming Conventions

- **Database files**: `snake_case.ts` (matches DB tables)
- **React components**: `PascalCase.tsx`
- **Hooks**: `usePascalCase.ts`
- **API routes**: Next.js convention (folders)

## Type Safety

### Database Types (Kysely)
```typescript
export type Guild = Selectable<GuildTable>;
export type NewGuild = Insertable<GuildTable>;
export type GuildUpdate = Updateable<GuildTable>;
```

### API Response Types
```typescript
interface GuildResponse {
  guild: Guild;
}
```

### Hook Return Types
```typescript
interface UseGuildResult {
  data: Guild | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

## Performance Optimizations

1. **Server Components**: Reduce client JS bundle
2. **TanStack Query**: Cache and deduplicate requests
3. **Middleware Caching**: Cache Discord guild list (2 min)
4. **Kysely**: Type-safe, efficient SQL queries
5. **Edge Middleware**: Fast auth checks

## Security

1. **Edge Middleware**: First line of defense
2. **Route Middleware**: Guild access verification
3. **Owner Checks**: Mutation routes require ownership
4. **Input Validation**: Zod schemas on all inputs
5. **CSRF Protection**: NextAuth built-in

## Error Handling

### API Routes
```typescript
try {
  const result = await queryFunction();
  return NextResponse.json({ result });
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### Client Components
```typescript
const { data, error, isLoading } = useGuild(guildId);

if (isLoading) return <Loading />;
if (error) return <Error message={error.message} />;
return <GuildView guild={data} />;
```

## Best Practices

1. **Separate Concerns**: API routes handle HTTP, query functions handle DB
2. **Type Everything**: Use TypeScript strictly
3. **Validate Inputs**: Zod schemas on all user input
4. **Check Auth**: Every protected route uses middleware
5. **Cache Wisely**: Balance freshness vs performance
6. **Handle Errors**: Graceful degradation everywhere

## Related Documentation

- [Middleware & Authorization](./MIDDLEWARE.md)
- [API Routes](./API_ROUTES.md)
- [State Management](./STATE_MANAGEMENT.md)
- [Database Queries](./DATABASE.md)
