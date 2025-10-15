# Next.js Interface Documentation

Documentation for the Discord Clip Saver web interface.

## Quick Links

- **[Architecture](./ARCHITECTURE.md)** - System overview, tech stack, and patterns
- **[Middleware & Authorization](./MIDDLEWARE.md)** - Auth levels and permission checks
- **[State Management](./STATE_MANAGEMENT.md)** - TanStack Query usage and patterns
- **[Database Layer](./DATABASE.md)** - Kysely queries and database operations

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Discord OAuth application

### Setup

1. Install dependencies: `cd interface && npm install`
2. Configure environment: `cp .env.example .env.local`
3. Run development server: `npm run dev`
4. Open browser: `http://localhost:3000`

## Project Structure

```
interface/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Main dashboard
│   │   └── install/      # Bot installation
│   ├── lib/              # Shared utilities
│   │   ├── db/           # Database queries
│   │   ├── hooks/        # React hooks
│   │   └── middleware/   # Auth middleware
│   └── middleware.ts     # Edge middleware
├── public/               # Static assets
└── package.json
```

## Key Concepts

### Layered Architecture
1. **API Routes** - HTTP handling, validation, auth
2. **Query Functions** - Database operations
3. **Database** - PostgreSQL storage

### Authorization Levels
1. **Authenticated** - Valid session
2. **Guild Access** - Member of guild
3. **Guild Owner** - Owns guild in DB

### State Management
- **TanStack Query** - Server state (guilds, channels, scans)
- **React State** - UI state (modals, forms, tabs)

## Common Tasks

### Add New API Route
1. Create route file: `app/api/guilds/[guildId]/new-route/route.ts`
2. Add middleware: `requireGuildAccess(req, guildId)`
3. Create query function: `lib/db/queries/new-feature.ts`
4. Export from: `lib/db/index.ts`

### Add New Query Hook
1. Create hook: `lib/hooks/queries/useNewFeature.ts`
2. Define query key factory
3. Use `useQuery` or `useMutation`
4. Export from hook file

### Add New Component
1. Create component: `app/dashboard/NewComponent.tsx`
2. Use `'use client'` if interactive
3. Import hooks and utilities
4. Style with Tailwind CSS
