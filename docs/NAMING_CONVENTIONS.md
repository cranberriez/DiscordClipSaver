# Naming Conventions - Next.js Interface

## File Naming

### Database Files
- **Schemas:** `snake_case.kysely.ts` (matches database table names)
  - Example: `channel_scan_status.kysely.ts`
- **Queries:** `snake_case.ts` (matches table/feature names)
  - Example: `scan_status.ts`, `channels.ts`

### React/Client Files
- **Hooks:** `usePascalCase.ts` (React convention)
  - Example: `useScanStatus.ts`, `useAuth.ts`
- **Components:** `PascalCase.tsx`
  - Example: `ScanButton.tsx`, `ChannelList.tsx`

### Server Files
- **Actions:** `kebab-case.ts` or `snake_case.ts`
  - Example: `scan.ts`, `user_actions.ts`
- **API Routes:** Follow Next.js convention (folder structure)
  - Example: `[guildId]/scan-statuses/route.ts`

### Utility Files
- **Redis:** `snake_case.ts` or `kebab-case.ts`
  - Example: `client.ts`, `jobs.ts`
- **Lib utilities:** `kebab-case.ts` or `camelCase.ts`
  - Example: `auth.ts`, `validation.ts`

## Type Naming

### Kysely Types (Database)
Use Kysely's generated types pattern:

```typescript
// Table interface
export interface ChannelScanStatusTable {
    guild_id: string;
    channel_id: string;
    // ...
}

// Generated types
export type ChannelScanStatus = Selectable<ChannelScanStatusTable>;
export type NewChannelScanStatus = Insertable<ChannelScanStatusTable>;
export type ChannelScanStatusUpdate = Updateable<ChannelScanStatusTable>;
```

**Benefits:**
- ✅ Type-safe selects, inserts, updates
- ✅ Handles `ColumnType` transformations automatically
- ✅ Consistent with Kysely best practices

### Custom Types
- **Enums:** `PascalCase`
  - Example: `ScanStatus`, `JobType`
- **Interfaces:** `PascalCase`
  - Example: `ChannelWithScanStatus`, `ScanResult`

## API Response Format

### Single Resource
```typescript
// GET /api/guilds/[guildId]/channels/[channelId]/scan-status
{
    "status": ChannelScanStatus | null
}
```

### Collection
```typescript
// GET /api/guilds/[guildId]/scan-statuses
{
    "channels": ChannelWithScanStatus[]  // All channels with status
}
```

**Note:** Returns ALL channels (with status joined), not just scanned channels.

## Hook Return Values

### Single Resource Hook
```typescript
export function useChannelScanStatus(guildId: string, channelId: string) {
    return {
        status: ChannelScanStatus | null,
        loading: boolean,
        error: string | null,
        refetch: () => Promise<void>
    };
}
```

### Collection Hook
```typescript
export function useGuildScanStatuses(guildId: string) {
    return {
        channels: ChannelWithScanStatus[],  // All channels
        loading: boolean,
        error: string | null,
        refetch: () => Promise<void>
    };
}
```

## Server Action Return Values

```typescript
export type ScanResult =
    | { success: true; jobId: string; messageId: string }
    | { success: false; error: string };
```

**Pattern:** Discriminated union for type-safe error handling

## Directory Structure

```
src/
  lib/
    db/
      schemas/          # *.kysely.ts (snake_case)
      queries/          # *.ts (snake_case)
    hooks/              # use*.ts (usePascalCase)
    actions/            # *.ts (snake_case or kebab-case)
    redis/              # *.ts (snake_case)
  app/
    api/                # Next.js convention
      guilds/
        [guildId]/
          scan-statuses/  # kebab-case for routes
            route.ts
```

## Examples

### ✅ Good
```typescript
// File: src/lib/db/schemas/channel_scan_status.kysely.ts
export type ChannelScanStatus = Selectable<ChannelScanStatusTable>;

// File: src/lib/db/queries/scan_status.ts
export async function getChannelScanStatus(...): Promise<ChannelScanStatus | null>

// File: src/lib/hooks/useScanStatus.ts
export function useGuildScanStatuses(guildId: string)

// File: src/lib/actions/scan.ts
export async function startChannelScan(...): Promise<ScanResult>
```

### ❌ Avoid
```typescript
// Don't create custom interfaces when Kysely types exist
export interface ChannelScanStatus {  // ❌ Use Selectable<Table> instead
    guild_id: string;
    // ...
}

// Don't use inconsistent naming
export function use-scan-status()  // ❌ Should be useScanStatus
export function getScan_Status()   // ❌ Pick one convention
```

## Rationale

1. **Database files use snake_case** - Matches PostgreSQL naming
2. **React hooks use usePascalCase** - React community standard
3. **Kysely generated types** - Type-safe, handles ColumnType correctly
4. **API returns collections, not filtered lists** - Reduces API calls
5. **Discriminated unions for results** - Type-safe error handling
