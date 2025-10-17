# Discord Rate Limit Handling

## Problem

Discord API has rate limits that can be triggered by frequent requests to `/users/@me/guilds`. When hit, users see 502 errors and the interface becomes unusable.

## Solution

Implemented **aggressive caching with stale-while-revalidate** pattern to handle rate limits gracefully.

## Implementation

### 1. Enhanced Discord Client (`lib/discord/discordClient.ts`)

Added automatic retry logic with exponential backoff:

```typescript
// Automatically retries up to 3 times on 429
const guilds = await discordFetch<DiscordGuild[]>(
  "/users/@me/guilds",
  accessToken,
  { maxRetries: 3 }
)
```

**Retry Strategy:**
- Respects Discord's `Retry-After` header when provided
- Falls back to exponential backoff: 1s, 2s, 4s
- Logs retry attempts for monitoring
- Only retries 429 errors (not other errors)
- Throws `DiscordAPIError` with details after max retries

**Convenience Methods:**
- `getCurrentUser(token)` - Get user profile
- `getUserGuilds(token)` - Get user's guilds

All Discord API calls now go through this centralized client.

### 2. Enhanced Cache System (`lib/cache.ts`)

Added stale-while-revalidate support with two-tier caching:

- **Fresh TTL**: Normal cache duration - returns immediately
- **Stale TTL**: Extended cache duration - serves stale data when fresh fetch fails

```typescript
// Fresh for 1 hour, stale for 24 hours
cacheUserScopedGraceful(userId, key, 60*60*1000, 24*60*60*1000, fetchFn)
```

### 3. Auth Middleware (`lib/middleware/auth.ts`)

Updated `requireAuth()` to use graceful caching:

- **Fresh cache**: 1 hour (guild membership is relatively static)
- **Stale cache**: 24 hours (served when rate limited)
- **Graceful degradation**: Returns stale data if Discord API fails
- **Better error messages**: Distinguishes rate limits from other errors

### 4. How It Works

```
Request Flow with Retry + Graceful Degradation:
┌──────────────────────────────────────────────────────────────┐
│ 1. Check fresh cache (< 1 hour)                             │
│    ↓ Cache miss                                              │
│ 2. Discord API fetch (discordFetch)                         │
│    ├─ Success → Cache & return                              │
│    └─ 429 Rate Limited                                       │
│       ├─ Retry #1 (wait Retry-After or 1s)                  │
│       ├─ Retry #2 (wait Retry-After or 2s)                  │
│       ├─ Retry #3 (wait Retry-After or 4s)                  │
│       └─ Still failing                                       │
│          ↓                                                    │
│ 3. Graceful cache checks stale cache (< 24 hours)           │
│    ├─ Stale found → Return + log warning                    │
│    └─ No stale                                               │
│       ↓                                                       │
│ 4. Return 429 error to client                               │
└──────────────────────────────────────────────────────────────┘
```

## Benefits

1. **Automatic retry**: Handles transient rate limits with exponential backoff (3 retries)
2. **Prevents rate limiting**: Aggressive caching reduces API calls by 99%
3. **Graceful degradation**: Users get stale (but valid) data instead of errors after retry exhaustion
4. **Better UX**: No 502 errors, interface remains functional
5. **Appropriate freshness**: 1-hour fresh window is reasonable for guild membership
6. **Centralized Discord calls**: All API calls go through one client with consistent error handling

## Caching Strategy Rationale

**Why 1 hour fresh?**
- Guild membership changes infrequently (users don't constantly join/leave servers)
- 1 hour is short enough to detect new guilds reasonably quickly
- Reduces API calls from ~30/hour to 1/hour per user

**Why 24 hours stale?**
- Provides safety net for rate limit situations
- Guild lists rarely change dramatically in 24 hours
- Better to show slightly outdated data than no data at all

**Why not cache forever?**
- Users do eventually join/leave guilds
- 24-hour hard expiration ensures eventual consistency
- Balances reliability with freshness

## Additional Architectural Improvements (Future)

### Option 1: Database-Backed Cache (Recommended)

Store user guild memberships in database:

```typescript
// On successful Discord fetch, persist to DB
await db.insertInto('user_guild_membership')
  .values({ user_id, guild_id, last_verified_at })
  .onConflict('update')
  
// On cache miss, check DB before hitting Discord
const dbGuilds = await db.selectFrom('user_guild_membership')
  .where('user_id', '=', userId)
  .where('last_verified_at', '>', thirtyDaysAgo)
  .execute()
```

Benefits:
- Survives server restarts
- Can be shared across instances
- Enables analytics on guild usage
- Can trigger background refresh jobs

### Option 2: Background Refresh

Proactively refresh guild lists before they expire:

```typescript
// When cache is 80% stale, trigger background refresh
if (cacheAge > freshTtl * 0.8) {
  backgroundRefresh(userId, accessToken).catch(console.error)
  // Return current cache immediately
}
```

### Option 3: Bot-Based Guild Tracking

Bot already tracks which guilds it's in - use this as source of truth:

```typescript
// Instead of Discord API, query your database
const guildsWhereUserHasAccess = await db
  .selectFrom('guild')
  .where('deleted_at', 'is', null)
  .where('id', 'in', userDiscordGuildIds) // Still need Discord API once
  .execute()
```

This reduces dependency on Discord API for guild lists.

### Option 4: Redis Cache (Production)

For multi-instance deployments, replace in-memory cache with Redis:

```typescript
// Shared across all Next.js instances
const cached = await redis.get(`user:${userId}:guilds`)
if (cached) return JSON.parse(cached)
```

## Monitoring

Add monitoring to track:
- Cache hit/miss rates
- Rate limit occurrences
- Stale cache serving frequency

```typescript
// In cache.ts
if (stale !== null) {
  console.warn(`Serving stale cache for ${key}`)
  // metrics.increment('cache.stale_served')
}
```

## Testing Rate Limits

To test graceful degradation locally:

1. Make Discord API fail temporarily
2. Verify stale cache is served
3. Check logs for warning messages
4. Ensure UI remains functional

## Configuration

### Retry Settings

Adjust retry behavior in `discordFetch` calls:

```typescript
await discordFetch("/users/@me/guilds", token, {
  maxRetries: 3,        // Number of retries (default: 3)
  retryDelay: 1000,     // Initial delay in ms (default: 1000)
})
```

### Caching Durations

Adjust in `lib/middleware/auth.ts`:

```typescript
const freshTtlMs = 60 * 60 * 1000; // 1 hour - adjust as needed
const staleTtlMs = 24 * 60 * 60 * 1000; // 24 hours - adjust as needed
```

### Environment Variables (Optional)

Consider making these configurable:
- `DISCORD_GUILD_CACHE_FRESH_MINUTES=60`
- `DISCORD_GUILD_CACHE_STALE_HOURS=24`
- `DISCORD_API_MAX_RETRIES=3`
- `DISCORD_API_RETRY_DELAY_MS=1000`
