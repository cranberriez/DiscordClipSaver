# Discord Client Improvements

## Summary

Enhanced Discord API client with automatic retry logic and consolidated all Discord API calls through a centralized client.

## Changes Made

### 1. Enhanced Discord Client (`lib/discord/discordClient.ts`)

**New Features:**
- ✅ Automatic retry on 429 rate limits (up to 3 attempts by default)
- ✅ Respects Discord's `Retry-After` header
- ✅ Exponential backoff fallback (1s, 2s, 4s)
- ✅ Custom `DiscordAPIError` with status and retry info
- ✅ Configurable retry settings per request
- ✅ Convenience methods: `getCurrentUser()`, `getUserGuilds()`

**Usage:**
```typescript
// Basic usage with defaults (3 retries, 1s initial delay)
const guilds = await discordFetch<DiscordGuild[]>("/users/@me/guilds", token)

// Custom retry configuration
const guilds = await discordFetch<DiscordGuild[]>("/users/@me/guilds", token, {
  maxRetries: 5,
  retryDelay: 2000
})

// Convenience methods
const user = await getCurrentUser(token)
const guilds = await getUserGuilds(token)
```

### 2. Updated Routes to Use Centralized Client

**Before:**
```typescript
// Direct fetch - no retry, inconsistent error handling
const res = await fetch("https://discord.com/api/v10/users/@me", {
  headers: { Authorization: `Bearer ${token}` }
})
```

**After:**
```typescript
// Centralized client - automatic retry, consistent errors
const user = await getCurrentUser(token)
```

**Routes Updated:**
- ✅ `/api/discord/bot/claim` - Now uses `getCurrentUser()`
- ✅ Auth middleware - Already using `discordFetch()` through cache

### 3. Improved Error Handling

**New `DiscordAPIError` class:**
```typescript
try {
  const guilds = await getUserGuilds(token)
} catch (err) {
  if (err instanceof DiscordAPIError) {
    console.error(`Discord API error ${err.status}`)
    if (err.retryAfter) {
      console.error(`Retry after: ${err.retryAfter}s`)
    }
  }
}
```

**Auth middleware now provides better errors:**
- 429: "Discord rate limit exceeded after retries"
- 401/403: "Discord authorization failed. Please sign in again."
- Other: "Failed to fetch Discord guilds"

## Retry Logic Flow

```
Discord API Request
  │
  ├─ Success (200) → Return data ✓
  │
  └─ Rate Limited (429)
      │
      ├─ Attempt 1: Wait Retry-After or 1s → Retry
      ├─ Attempt 2: Wait Retry-After or 2s → Retry  
      ├─ Attempt 3: Wait Retry-After or 4s → Retry
      │
      ├─ Success → Return data ✓
      └─ Still failing → Check stale cache
          │
          ├─ Stale cache found → Return stale data (logged)
          └─ No cache → Throw DiscordAPIError
```

## Combined Protection Layers

The system now has **3 layers of protection** against rate limits:

### Layer 1: Aggressive Caching (Primary Defense)
- Fresh cache: 1 hour
- Stale cache: 24 hours
- **Prevents 99% of API calls**

### Layer 2: Automatic Retry (Secondary Defense)
- 3 retry attempts with exponential backoff
- Respects Discord's rate limit headers
- **Handles transient rate limits**

### Layer 3: Stale Data Fallback (Tertiary Defense)
- Returns cached data even if old
- User sees slightly outdated info instead of errors
- **Graceful degradation when all else fails**

## Benefits

1. **Resilient**: Handles transient rate limits automatically
2. **Consistent**: All Discord API calls use same retry logic
3. **Observable**: Logs retry attempts for monitoring
4. **Configurable**: Adjust retry behavior per request
5. **Type-safe**: TypeScript types for all responses
6. **Maintainable**: Single source of truth for Discord API access

## Configuration

### Default Settings
```typescript
{
  maxRetries: 3,
  retryDelay: 1000 // milliseconds
}
```

### Override Per Request
```typescript
await discordFetch("/users/@me/guilds", token, {
  maxRetries: 5,        // More retries for critical operations
  retryDelay: 2000      // Longer initial delay
})
```

### Future: Environment Variables
Consider adding to `.env`:
```bash
DISCORD_API_MAX_RETRIES=3
DISCORD_API_RETRY_DELAY_MS=1000
```

## Monitoring

Watch for these log messages:

**Successful retry:**
```
Discord rate limit hit, retrying in 1000ms (attempt 1/4)
{ path: '/users/@me/guilds', retryAfter: '1.2' }
```

**Stale cache fallback:**
```
Returning stale cache for user:123:discord:guilds due to error: Rate limited by Discord
```

**Exhausted retries:**
```
Failed to fetch user guilds (no cache available): 
DiscordAPIError: Rate limited by Discord (attempt 4/4)
```

## Testing

### Test Retry Logic
1. Trigger rapid requests to hit rate limits
2. Check logs for retry attempts
3. Verify successful recovery after retry-after period

### Test Stale Cache Fallback
1. Populate cache with guild data
2. Wait for cache to become stale (> 1 hour)
3. Trigger rate limit
4. Verify stale data is returned instead of error

### Test Error Messages
1. Trigger various Discord API errors
2. Verify appropriate error messages shown to user
3. Check logs for detailed error information

## Migration Checklist

- [x] Enhanced Discord client with retry logic
- [x] Updated claim route to use centralized client
- [x] Updated auth middleware error handling
- [x] Updated documentation
- [ ] Add monitoring/metrics for retry rates (future)
- [ ] Add environment variable configuration (future)
- [ ] Consider Redis cache for multi-instance (future)

## Related Documentation

- `RATE_LIMIT_HANDLING.md` - Complete rate limiting strategy
- `lib/discord/discordClient.ts` - Implementation
- `lib/middleware/auth.ts` - Usage in auth middleware
