# Database Layer

## Overview

The interface uses **Kysely** for type-safe database queries with PostgreSQL.

## Architecture

### Separation of Concerns

```
API Routes (app/api)
  ↓ (calls)
Query Functions (lib/db/queries)
  ↓ (uses)
Kysely Client (lib/db/db.ts)
  ↓ (connects to)
PostgreSQL Database
```

### Rules

**API Routes:**
- ❌ Never use `getDb()` directly
- ❌ Never write SQL/Kysely queries
- ✅ Always call query functions from `lib/db/queries`
- ✅ Handle HTTP concerns only

**Query Functions:**
- ✅ Use `getDb()` for database access
- ✅ Write type-safe Kysely queries
- ✅ Return typed results
- ❌ No HTTP concerns (no NextResponse, etc.)
- ❌ No authentication/authorization logic

## Directory Structure

```
lib/db/
├── queries/              # Database query functions
│   ├── guilds.ts         # Guild operations
│   ├── channels.ts       # Channel operations
│   ├── scan_status.ts    # Scan status operations
│   └── guild_settings.ts # Settings operations
├── schemas/              # Kysely type definitions
│   ├── guild.kysely.ts
│   ├── channel.kysely.ts
│   └── *.kysely.ts
├── types.ts              # Exported types
├── index.ts              # Public exports
└── db.ts                 # Database connection
```

## Database Connection

```typescript
// lib/db/db.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types';

let db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!db) {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 10,
        }),
      }),
    });
  }
  return db;
}
```

## Type Definitions

### Kysely Schema Pattern

```typescript
// lib/db/schemas/guild.kysely.ts
import { Selectable, Insertable, Updateable, ColumnType } from 'kysely';

export interface GuildTable {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  message_scan_enabled: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// Generated types
export type Guild = Selectable<GuildTable>;
export type NewGuild = Insertable<GuildTable>;
export type GuildUpdate = Updateable<GuildTable>;
```

### Benefits
- Type-safe selects, inserts, updates
- Handles `ColumnType` transformations automatically
- Consistent with Kysely best practices

## Query Functions

### Basic Query

```typescript
// lib/db/queries/guilds.ts
import { getDb } from '../db';
import type { Guild } from '../types';

export async function getSingleGuildById(
  id: string
): Promise<Guild | undefined> {
  return await getDb()
    .selectFrom('guild')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
}
```

### Query with Join

```typescript
export async function getChannelsByGuildId(
  guildId: string
): Promise<Channel[]> {
  return await getDb()
    .selectFrom('channel')
    .where('guild_id', '=', guildId)
    .orderBy('name', 'asc')
    .selectAll()
    .execute();
}
```

### Insert Query

```typescript
export async function createGuild(
  guild: NewGuild
): Promise<Guild> {
  return await getDb()
    .insertInto('guild')
    .values(guild)
    .returningAll()
    .executeTakeFirstOrThrow();
}
```

### Update Query

```typescript
export async function updateGuildMessageScanEnabled(
  guildId: string,
  enabled: boolean
): Promise<void> {
  await getDb()
    .updateTable('guild')
    .set({
      message_scan_enabled: enabled,
      updated_at: new Date(),
    })
    .where('id', '=', guildId)
    .executeTakeFirst();
}
```

### Delete Query

```typescript
export async function deleteGuild(
  guildId: string
): Promise<void> {
  await getDb()
    .deleteFrom('guild')
    .where('id', '=', guildId)
    .executeTakeFirst();
}
```

### Complex Query with Multiple Joins

```typescript
export async function getChannelScanStatusesWithInfo(
  guildId: string
): Promise<ChannelWithScanStatus[]> {
  return await getDb()
    .selectFrom('channel')
    .leftJoin(
      'channel_scan_status',
      'channel.id',
      'channel_scan_status.channel_id'
    )
    .where('channel.guild_id', '=', guildId)
    .select([
      'channel.id as channelId',
      'channel.name as channelName',
      'channel.message_scan_enabled',
      'channel_scan_status.status',
      'channel_scan_status.message_count',
      'channel_scan_status.total_messages_scanned',
      'channel_scan_status.updated_at',
    ])
    .orderBy('channel.name', 'asc')
    .execute();
}
```

## Public Exports

```typescript
// lib/db/index.ts
export {
  getSingleGuildById,
  getGuildsByIds,
  updateGuildMessageScanEnabled,
} from './queries/guilds';

export {
  getChannelsByGuildId,
  bulkUpdateChannelsEnabled,
} from './queries/channels';

export {
  getChannelScanStatus,
  getGuildScanStatuses,
} from './queries/scan_status';

export type { Guild, Channel, ChannelScanStatus } from './types';
```

### Benefits
- Single source of truth for imports
- Clear public API surface
- Easy to refactor internals

## Usage in API Routes

### ✅ Good Pattern

```typescript
// app/api/guilds/[guildId]/route.ts
import { getSingleGuildById } from '@/lib/db';

export async function GET(req, { params }) {
  const auth = await requireGuildAccess(req, params.guildId);
  if (auth instanceof NextResponse) return auth;
  
  const guild = await getSingleGuildById(params.guildId);
  return NextResponse.json({ guild });
}
```

### ❌ Bad Pattern

```typescript
// app/api/guilds/[guildId]/route.ts
import { getDb } from '@/lib/db/db';

export async function GET(req, { params }) {
  // ❌ Direct DB access in route
  const guild = await getDb()
    .selectFrom('guild')
    .where('id', '=', params.guildId)
    .selectAll()
    .executeTakeFirst();
    
  return NextResponse.json({ guild });
}
```

## Transaction Support

```typescript
export async function updateGuildAndChannels(
  guildId: string,
  enabled: boolean
): Promise<void> {
  await getDb().transaction().execute(async (trx) => {
    // Update guild
    await trx
      .updateTable('guild')
      .set({ message_scan_enabled: enabled })
      .where('id', '=', guildId)
      .execute();
    
    // Update all channels
    await trx
      .updateTable('channel')
      .set({ message_scan_enabled: enabled })
      .where('guild_id', '=', guildId)
      .execute();
  });
}
```

## Error Handling

```typescript
export async function getSingleGuildById(
  id: string
): Promise<Guild | undefined> {
  try {
    return await getDb()
      .selectFrom('guild')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  } catch (error) {
    console.error('Failed to fetch guild:', error);
    throw new Error('Database query failed');
  }
}
```

## Query Optimization

### Use Indexes

```sql
-- Ensure indexes exist for common queries
CREATE INDEX idx_channel_guild_id ON channel(guild_id);
CREATE INDEX idx_scan_status_channel_id ON channel_scan_status(channel_id);
```

### Select Only Needed Columns

```typescript
// ✅ Good - select specific columns
const guilds = await getDb()
  .selectFrom('guild')
  .select(['id', 'name', 'icon_url'])
  .execute();

// ⚠️ Okay but slower - select all
const guilds = await getDb()
  .selectFrom('guild')
  .selectAll()
  .execute();
```

### Use Batch Operations

```typescript
// ✅ Good - single query
export async function bulkUpdateChannelsEnabled(
  channelIds: string[],
  enabled: boolean
): Promise<void> {
  await getDb()
    .updateTable('channel')
    .set({ message_scan_enabled: enabled })
    .where('id', 'in', channelIds)
    .execute();
}

// ❌ Bad - multiple queries
for (const channelId of channelIds) {
  await getDb()
    .updateTable('channel')
    .set({ message_scan_enabled: enabled })
    .where('id', '=', channelId)
    .execute();
}
```

## Testing

### Mock Database

```typescript
// __tests__/db/guilds.test.ts
import { getSingleGuildById } from '@/lib/db/queries/guilds';

jest.mock('@/lib/db/db', () => ({
  getDb: () => ({
    selectFrom: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    executeTakeFirst: jest.fn().mockResolvedValue({
      id: '123',
      name: 'Test Guild',
    }),
  }),
}));

test('getSingleGuildById returns guild', async () => {
  const guild = await getSingleGuildById('123');
  expect(guild).toEqual({
    id: '123',
    name: 'Test Guild',
  });
});
```

## Best Practices

### 1. Keep Functions Focused

```typescript
// ✅ Good - single responsibility
export async function updateGuildMessageScanEnabled(
  guildId: string,
  enabled: boolean
): Promise<void> {
  await getDb()
    .updateTable('guild')
    .set({ message_scan_enabled: enabled })
    .where('id', '=', guildId)
    .execute();
}

// ❌ Bad - too many responsibilities
export async function updateGuildAndDoEverything(
  guildId: string,
  data: any
): Promise<void> {
  // Updates multiple tables
  // Sends notifications
  // Logs events
  // etc.
}
```

### 2. Use Descriptive Names

```typescript
// ✅ Good
export async function getSingleGuildById(id: string)
export async function getChannelsByGuildId(guildId: string)
export async function updateGuildMessageScanEnabled(id: string, enabled: boolean)

// ❌ Bad
export async function get(id: string)
export async function fetch(id: string)
export async function update(data: any)
```

### 3. Return Typed Results

```typescript
// ✅ Good
export async function getSingleGuildById(
  id: string
): Promise<Guild | undefined> {
  // ...
}

// ❌ Bad
export async function getSingleGuildById(id: string): Promise<any> {
  // ...
}
```

### 4. Handle Null/Undefined

```typescript
// ✅ Good - explicit null handling
const guild = await getSingleGuildById(id);
if (!guild) {
  throw new Error('Guild not found');
}

// ❌ Bad - assumes guild exists
const guild = await getSingleGuildById(id);
console.log(guild.name); // Crashes if null
```

## Common Queries

### Get All Guilds for User

```typescript
export async function getGuildsByIds(
  guildIds: string[]
): Promise<Guild[]> {
  return await getDb()
    .selectFrom('guild')
    .where('id', 'in', guildIds)
    .selectAll()
    .execute();
}
```

### Get Channels with Settings

```typescript
export async function getChannelsWithSettings(
  guildId: string
): Promise<ChannelWithSettings[]> {
  return await getDb()
    .selectFrom('channel')
    .leftJoin(
      'channel_settings',
      'channel.id',
      'channel_settings.channel_id'
    )
    .where('channel.guild_id', '=', guildId)
    .selectAll()
    .execute();
}
```

### Count Records

```typescript
export async function countGuilds(): Promise<number> {
  const result = await getDb()
    .selectFrom('guild')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirst();
    
  return Number(result?.count ?? 0);
}
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Routes](./API_ROUTES.md)
- [Kysely Documentation](https://kysely.dev/)
