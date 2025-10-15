# Interface Architecture

## Layered Architecture

```
┌─────────────────────────────────────────┐
│         API Routes (app/api)            │  ← HTTP endpoints
│  - Validation (Zod schemas)             │
│  - Authentication checks                │
│  - Authorization checks                 │
│  - Call query functions                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Query Functions (lib/db/queries)   │  ← Database operations
│  - guilds.ts                            │
│  - channels.ts                          │
│  - scan_status.ts                       │
│  - guild_settings.ts                    │
│  - channel_settings.ts                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)           │  ← Data storage
└─────────────────────────────────────────┘
```

## Separation of Concerns

### ✅ API Routes (app/api)
**Responsibility:** HTTP handling, validation, auth

```typescript
// app/api/guilds/[guildId]/toggle/route.ts
export async function POST(req: NextRequest, { params }) {
    // 1. Authentication
    const authInfo = await tryGetAuthInfo(req);
    if (!authInfo) return unauthorized();
    
    // 2. Authorization
    const guild = await getSingleGuildById(guildId);
    if (guild.owner_id !== authInfo.discordUserId) return forbidden();
    
    // 3. Validation
    const validation = ToggleSchema.safeParse(body);
    if (!validation.success) return badRequest();
    
    // 4. Call query function (NOT direct DB access)
    await updateGuildMessageScanEnabled(guildId, enabled);
    
    return success();
}
```

**Rules:**
- ❌ Never use `getDb()` directly
- ❌ Never write SQL/Kysely queries
- ✅ Always call query functions from `lib/db/queries`
- ✅ Handle HTTP concerns only

### ✅ Query Functions (lib/db/queries)
**Responsibility:** Database operations

```typescript
// lib/db/queries/guilds.ts
export async function updateGuildMessageScanEnabled(
    guildId: string,
    enabled: boolean
): Promise<void> {
    await getDb()
        .updateTable("guild")
        .set({
            message_scan_enabled: enabled,
            updated_at: new Date(),
        })
        .where("id", "=", guildId)
        .executeTakeFirst();
}
```

**Rules:**
- ✅ Use `getDb()` for database access
- ✅ Write type-safe Kysely queries
- ✅ Return typed results (use Kysely generated types)
- ✅ Keep functions focused (single responsibility)
- ❌ No HTTP concerns (no NextResponse, etc.)
- ❌ No authentication/authorization logic

### ✅ Exports (lib/db/index.ts)
**Responsibility:** Public API surface

```typescript
// lib/db/index.ts
export {
    getSingleGuildById,
    updateGuildMessageScanEnabled,
} from "./queries/guilds";

export {
    bulkUpdateChannelsEnabled,
} from "./queries/channels";
```

**Rules:**
- ✅ Export all public query functions
- ✅ Single source of truth for imports
- ❌ Don't export internal helpers

## Benefits

### 1. **Testability**
```typescript
// Easy to test query functions in isolation
test("updateGuildMessageScanEnabled", async () => {
    await updateGuildMessageScanEnabled("123", true);
    const guild = await getSingleGuildById("123");
    expect(guild.message_scan_enabled).toBe(true);
});
```

### 2. **Reusability**
```typescript
// Same function used by multiple routes
await updateGuildMessageScanEnabled(guildId, true);  // API route
await updateGuildMessageScanEnabled(guildId, false); // Server action
await updateGuildMessageScanEnabled(guildId, true);  // Background job
```

### 3. **Type Safety**
```typescript
// Query functions return typed results
const guild: Guild | null = await getSingleGuildById(id);
const channels: Channel[] = await getChannelsByGuildId(id);
```

### 4. **Maintainability**
```typescript
// Change DB schema? Update query function once
// All API routes automatically get the fix
export async function updateGuildMessageScanEnabled(...) {
    // Add new field here
    await getDb().updateTable("guild").set({
        message_scan_enabled: enabled,
        updated_at: new Date(),
        scan_enabled_by: userId,  // New field
    })...
}
```

### 5. **Consistency**
```typescript
// All updates use same pattern
await updateGuildMessageScanEnabled(id, true);
await bulkUpdateChannelsEnabled(id, true);
// vs inconsistent direct queries in routes
```

## File Organization

```
src/
  app/
    api/
      guilds/
        [guildId]/
          toggle/
            route.ts           ← HTTP handler only
          channels/
            bulk/
              route.ts         ← HTTP handler only
          scan-statuses/
            route.ts           ← HTTP handler only
  lib/
    db/
      queries/
        guilds.ts              ← Guild database operations
        channels.ts            ← Channel database operations
        scan_status.ts         ← Scan status operations
        guild_settings.ts      ← Settings operations
      schemas/
        *.kysely.ts            ← Type definitions
      index.ts                 ← Public exports
      db.ts                    ← Database connection
```

## Examples

### ❌ Bad (Direct DB access in route)
```typescript
// app/api/guilds/[guildId]/toggle/route.ts
export async function POST(req, { params }) {
    // ... auth checks ...
    
    // ❌ Direct DB access in route
    await getDb()
        .updateTable("guild")
        .set({ message_scan_enabled: enabled })
        .where("id", "=", guildId)
        .executeTakeFirst();
}
```

### ✅ Good (Query function)
```typescript
// app/api/guilds/[guildId]/toggle/route.ts
export async function POST(req, { params }) {
    // ... auth checks ...
    
    // ✅ Call query function
    await updateGuildMessageScanEnabled(guildId, enabled);
}

// lib/db/queries/guilds.ts
export async function updateGuildMessageScanEnabled(
    guildId: string,
    enabled: boolean
): Promise<void> {
    await getDb()
        .updateTable("guild")
        .set({ message_scan_enabled: enabled, updated_at: new Date() })
        .where("id", "=", guildId)
        .executeTakeFirst();
}
```

## Migration Checklist

When creating new API routes:

- [ ] Create query function in `lib/db/queries/*.ts`
- [ ] Export from `lib/db/index.ts`
- [ ] Import in API route from `@/lib/db`
- [ ] Call query function (no direct `getDb()` in route)
- [ ] Add validation (Zod schema)
- [ ] Add authentication check
- [ ] Add authorization check
- [ ] Return typed response

## Current Status

✅ **Refactored:**
- `POST /api/guilds/[guildId]/toggle` → Uses `updateGuildMessageScanEnabled()`
- `POST /api/guilds/[guildId]/channels/bulk` → Uses `bulkUpdateChannelsEnabled()`

✅ **Already Following Pattern:**
- All scan status routes use query functions
- Settings routes use query functions

This architecture ensures clean separation, better testability, and easier maintenance! 🎉
