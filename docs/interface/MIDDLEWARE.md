# Middleware & Authorization

## Overview

The interface uses a two-layer authorization system:
1. **Edge Middleware** - Fast authentication check (blocks unauthenticated requests)
2. **Route Middleware** - Granular permission checks (guild access, ownership)

## Edge Middleware

Located at `src/middleware.ts`, runs on Edge Runtime before route handlers.

### Purpose
- First line of defense
- Blocks unauthenticated API requests
- Runs before route handlers execute
- Very fast (Edge Runtime)

### Implementation
```typescript
export async function middleware(request: NextRequest) {
  if (pathname.startsWith('/api/')) {
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}
```

### Public Routes
These routes bypass authentication:
- `/api/auth/*` - NextAuth routes
- Add webhooks here if needed

## Route Middleware

Located at `src/lib/middleware/auth.ts`, provides granular permission checks.

### Authorization Levels

| Level | Check | Use Case | Example Routes |
|-------|-------|----------|----------------|
| **Authenticated** | User has valid session | Read-only public data | `/api/discord/user/guilds` |
| **Guild Access** | User is member of guild | View guild data | `GET /api/guilds/[guildId]` |
| **Guild Owner** | User owns the guild in DB | Modify settings, start scans | `POST /api/guilds/[guildId]/toggle` |

### 1. Require Authentication

Use for routes that need basic authentication only.

```typescript
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  
  // auth.discordUserId, auth.accessToken, auth.userGuilds available
  return NextResponse.json({ userId: auth.discordUserId });
}
```

**Returns:**
- `AuthContext` - User info + cached Discord guilds
- `NextResponse` - Error response (401, 502)

**Features:**
- Caches Discord guild list for 2 minutes
- Prevents rate limiting
- Prevents DDoS via excessive Discord API calls

### 2. Require Guild Access

Use for routes that need to verify user has Discord access to a guild.

```typescript
import { requireGuildAccess } from '@/lib/middleware/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const auth = await requireGuildAccess(req, guildId);
  if (auth instanceof NextResponse) return auth;
  
  // auth.guild, auth.isOwner, auth.hasAccess available
  return NextResponse.json({ guild: auth.guild });
}
```

**Checks:**
1. User is authenticated
2. Guild exists in database
3. User has access to guild on Discord (via cached guild list)

**Returns:**
- `GuildAuthContext` - Full auth context + guild info
- `NextResponse` - Error response (401, 403, 404, 502)

### 3. Require Guild Ownership

Use for mutation routes and sensitive operations.

```typescript
import { requireGuildAccess } from '@/lib/middleware/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const auth = await requireGuildAccess(req, guildId, true); // requireOwner = true
  if (auth instanceof NextResponse) return auth;
  
  // Only guild owner reaches here
  await updateGuildSettings(guildId, settings);
  return NextResponse.json({ success: true });
}
```

**Checks:**
1. All checks from "Require Guild Access"
2. User is the guild owner in database (`guild.owner_id === user.id`)

## Authorization Matrix

| Route Pattern | Method | Auth Level | Notes |
|---------------|--------|------------|-------|
| `/api/auth/*` | ALL | None | NextAuth public routes |
| `/api/discord/user/guilds` | GET | Authenticated | User's Discord guilds |
| `/api/guilds/[guildId]` | GET | Guild Access | View guild details |
| `/api/guilds/[guildId]/channels` | GET | Guild Access | View channels |
| `/api/guilds/[guildId]/scan-statuses` | GET | Guild Access | View scan status |
| `/api/guilds/[guildId]/toggle` | POST | Guild Owner | Enable/disable scanning |
| `/api/guilds/[guildId]/settings` | GET | Guild Access | View settings |
| `/api/guilds/[guildId]/settings` | PATCH | Guild Owner | Update settings |
| `/api/guilds/[guildId]/channels/bulk` | POST | Guild Owner | Bulk enable/disable |

## Channel Permissions

Located at `src/lib/middleware/channels.ts`.

### Filter Channels by Permissions

```typescript
import { filterChannelsByPermissions } from '@/lib/middleware/channels';

export async function GET(req: NextRequest, { params }) {
  const auth = await requireGuildAccess(req, params.guildId);
  if (auth instanceof NextResponse) return auth;
  
  const allChannels = await getChannelsByGuildId(params.guildId);
  const visibleChannels = filterChannelsByPermissions(
    allChannels,
    auth.discordGuild
  );
  
  return NextResponse.json({ channels: visibleChannels });
}
```

**Current Logic:**
- Guild owner or admin: see all channels
- Other users: see all channels (simplified)

**Future Enhancement:**
- Fetch channel-specific permission overwrites from Discord
- Check role-based permissions
- Apply user-specific permission overwrites

## Discord Permissions

Helper functions for checking Discord permissions.

```typescript
import { 
  hasPermission, 
  canManageGuild,
  DiscordPermissions 
} from '@/lib/middleware/auth';

// Check specific permission
if (hasPermission(auth.discordGuild, DiscordPermissions.ADMINISTRATOR)) {
  // User is admin
}

// Check if user can manage guild
if (canManageGuild(auth.discordGuild)) {
  // User can manage guild settings
}
```

### Available Permissions
```typescript
DiscordPermissions.ADMINISTRATOR
DiscordPermissions.MANAGE_GUILD
DiscordPermissions.MANAGE_CHANNELS
DiscordPermissions.VIEW_CHANNEL
DiscordPermissions.SEND_MESSAGES
DiscordPermissions.READ_MESSAGE_HISTORY
```

## Caching Strategy

### Why Cache Discord Guilds?

**Problem:**
- Every API call needs to verify guild access
- Discord API has rate limits (50 requests/second)
- Multiple components may check same guild
- Vulnerable to DDoS attacks

**Solution:**
- Cache user's Discord guild list for 2 minutes
- Stored in memory (per-user)
- Automatic refresh after TTL
- Shared across all API routes

### Cache Implementation

```typescript
// lib/cache.ts
export async function cacheUserScoped<T>(
  userId: string,
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cacheKey = `${userId}:${key}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
  return data;
}
```

## Error Responses

### 401 Unauthorized
```json
{ "error": "Unauthorized" }
```
**Cause:** No valid session or missing Discord token

### 403 Forbidden
```json
{ "error": "You do not have access to this guild" }
```
**Cause:** User not a member of the guild on Discord

```json
{ "error": "You must be the guild owner to perform this action" }
```
**Cause:** User is not the guild owner in database

### 404 Not Found
```json
{ "error": "Guild not found" }
```
**Cause:** Guild doesn't exist in database

### 502 Bad Gateway
```json
{ "error": "Failed to fetch Discord guilds" }
```
**Cause:** Discord API request failed

## Best Practices

### 1. Always Check Auth
```typescript
// ✅ Good
const auth = await requireGuildAccess(req, guildId);
if (auth instanceof NextResponse) return auth;

// ❌ Bad - no auth check
const guild = await getSingleGuildById(guildId);
```

### 2. Use Correct Auth Level
```typescript
// ✅ Good - read operation uses Guild Access
export async function GET(req, { params }) {
  const auth = await requireGuildAccess(req, params.guildId);
  // ...
}

// ✅ Good - mutation uses Guild Owner
export async function POST(req, { params }) {
  const auth = await requireGuildAccess(req, params.guildId, true);
  // ...
}
```

### 3. Return Early on Error
```typescript
// ✅ Good
const auth = await requireGuildAccess(req, guildId);
if (auth instanceof NextResponse) return auth;

// ❌ Bad - doesn't handle error response
const auth = await requireGuildAccess(req, guildId);
// Continues even if auth is an error response
```

### 4. Don't Bypass Middleware
```typescript
// ❌ Bad - bypasses auth checks
export async function POST(req, { params }) {
  const guild = await getSingleGuildById(params.guildId);
  await updateGuildSettings(guild.id, settings);
}

// ✅ Good - uses middleware
export async function POST(req, { params }) {
  const auth = await requireGuildAccess(req, params.guildId, true);
  if (auth instanceof NextResponse) return auth;
  
  await updateGuildSettings(auth.guild.id, settings);
}
```

## Security Considerations

1. **Never trust client input** - Always validate with Zod
2. **Check ownership for mutations** - Use `requireOwner: true`
3. **Cache guild list** - Prevent rate limiting and DDoS
4. **Return early on errors** - Don't leak information
5. **Log security events** - Track unauthorized access attempts

## Testing Auth

```typescript
// Test authenticated route
const response = await fetch('/api/guilds/123', {
  headers: {
    cookie: sessionCookie, // Include session
  },
});

// Test guild access
const response = await fetch('/api/guilds/123', {
  headers: {
    cookie: sessionCookie,
  },
});
// Should return 403 if user not in guild

// Test owner requirement
const response = await fetch('/api/guilds/123/toggle', {
  method: 'POST',
  headers: {
    cookie: sessionCookie,
  },
});
// Should return 403 if user not owner
```

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Routes](./API_ROUTES.md)
