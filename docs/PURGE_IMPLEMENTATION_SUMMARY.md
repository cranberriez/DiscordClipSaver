# Purge System Implementation Summary

## What Was Implemented

### ✅ Database Schema Updates
- **Channel `purge_cooldown` already exists** - Used to prevent abuse with configurable cooldown
- **Guild `deleted_at` already existed** - Used for soft delete on removal
- No new migrations required

### ✅ Worker Purge Jobs
**New Files:**
- `python/worker/purge/purge_handler.py` - Core purge logic
  - `purge_channel()` - Delete all data for a channel, set cooldown (default 5 min)
  - `purge_guild()` - Delete all data for guild including channels, then leave

**Modified Files:**
- `python/worker/processor.py` - Added purge job routing and scan stop methods
- `python/shared/redis/redis.py` - Added `PurgeChannelJob` and `PurgeGuildJob` types

### ✅ Scan Stop Mechanism
**Worker Side:**
- `_stop_channel_scan()` - Cancel active scan for channel
- `_stop_guild_scans()` - Cancel all active scans for guild

**Bot Side:**
- `python/bot/services/guild_service.py` - Updated `on_guild_remove()` to:
  - Stop all active scans
  - Soft delete guild (sets `deleted_at`)
  - Idempotent (safe if guild already deleted)

### ✅ API Routes
**New Routes:**
- `POST /api/guilds/[guildId]/channels/[channelId]/purge` - Purge single channel
  - Checks purge cooldown
  - Returns 429 if cooldown active with cooldown_until timestamp
  - Cooldown configurable via PURGE_COOLDOWN_MINUTES (default 5)
  
- `POST /api/guilds/[guildId]/purge` - Purge entire guild
  - Checks guild not deleted
  - Returns clip count stats

**Authorization:**
- Both routes require guild ownership (not just Discord access)
- Uses existing `requireGuildAccess(req, guildId, true)` middleware

### ✅ UI Components
**New Components:**
- `interface/src/components/purge/PurgeButton.tsx` - Reusable purge button
  - Type-to-confirm safety
  - Loading states
  - Error handling with cooldown display
  - Fixed HTML nesting (uses `asChild` with divs)
  
- `interface/src/components/guild/DangerZone.tsx` - Danger zone section with THREE purge levels:
  - Purge specific channel (with dropdown selector, shows cooldown errors)
  - Purge all channels (skips channels on cooldown, shows summary)
  - Purge guild (delete everything and leave)
  - Shows clip counts for each option
  
- `interface/src/components/guild/DeletedGuildBanner.tsx` - Deleted guild banner
  - Shows when guild is deleted
  - Re-invite bot button
  - Links to install flow

**Modified Files:**
- `interface/src/app/(dashboard)/dashboard/[guildId]/layout.tsx` - Shows deleted banner
- `interface/src/app/(dashboard)/dashboard/[guildId]/settings/page.tsx` - Added danger zone

### ✅ TypeScript Types
**Modified Files:**
- `interface/src/lib/redis/types.ts` - Added purge job types
- `interface/src/lib/redis/jobs.ts` - Added job dispatchers
  - `queueChannelPurge()`
  - `queueGuildPurge()`

### ✅ Documentation
**New Files:**
- `docs/PURGE_SYSTEM.md` - Complete system documentation
- `docs/PURGE_IMPLEMENTATION_SUMMARY.md` - This file
- `migrations/add_purge_cooldown.sql` - Database migration

## What You Need To Do

### 1. Restart Services
After migration:
```bash
# Restart worker to load new job handlers
docker-compose restart worker

# Restart bot to load updated guild service
docker-compose restart bot

# Restart interface to load new API routes
docker-compose restart interface
```

### 3. Test the Implementation
**Testing Guild Purge:**
1. Navigate to a guild settings page: `/dashboard/[guildId]/settings`
2. Scroll to "Danger Zone" section
3. Click "Purge Guild" button
4. Type "DELETE GUILD" to confirm
5. Verify:
   - Purge job is queued
   - Bot leaves guild
   - Guild shows "Deleted" banner
   - Re-invite button appears

**Testing Channel Purge:**
1. Select a channel from the dropdown in Danger Zone
2. Click purge for a channel
3. Verify cooldown is set (5 minutes by default)
4. Try purging again immediately
5. Verify 429 error with remaining time displayed
6. Test with PURGE_COOLDOWN_MINUTES=0 to disable cooldown

### 4. Test All Three Purge Levels
The DangerZone component now includes all three purge levels:

**Purge Specific Channel:**
1. Select a channel from the dropdown
2. Click "Purge Channel"
3. Type the channel name to confirm
4. Verify cooldown is set (default 5 minutes)
5. Try purging again - should show "Try again in X minute(s)"

**Purge All Channels:**
1. Click "Purge All"
2. Type "DELETE ALL CHANNELS" to confirm
3. Verify channels on cooldown are skipped
4. Verify summary shows "Purged X channel(s), skipped Y on cooldown"
5. Bot stays in guild

**Purge Guild:**
1. Click "Purge Guild"
2. Type "DELETE GUILD" to confirm
3. Verify bot leaves and deleted banner appears

## Architecture Decisions

### Why Separate Bot Leave from Purge?
**Benefits:**
- Accidental kicks preserve data
- User controls data deletion
- Re-inviting bot can restore access
- Audit trail maintained

### Why Soft Delete Guild?
**Benefits:**
- Allows grace period (future enhancement)
- Preserves audit trail
- Can implement "undo" later
- Simpler recovery if bot re-invited

### Why Purge Cooldown?
**Benefits:**
- Prevents rapid repeated purges
- Configurable via environment variable
- Can be disabled for testing (set to 0)
- Rate limiting without permanent blocks
- Allows re-purging after cooldown expires

## Key Files Changed

### Backend (Python)
```
python/
├── bot/services/guild_service.py           # Updated on_guild_remove
├── shared/
│   ├── db/models.py                         # Added purge_cooldown field
│   └── redis/redis.py                       # Added purge job types
└── worker/
    ├── processor.py                          # Added purge job routing
    └── purge/purge_handler.py                # NEW - Purge logic
```

### Frontend (TypeScript)
```
interface/src/
├── app/
│   ├── api/guilds/[guildId]/
│   │   ├── channels/[channelId]/purge/route.ts  # NEW - Channel purge API
│   │   └── purge/route.ts                        # NEW - Guild purge API
│   └── (dashboard)/dashboard/[guildId]/
│       ├── layout.tsx                            # Shows deleted banner
│       └── settings/page.tsx                     # Added danger zone
├── components/
│   ├── guild/
│   │   ├── DangerZone.tsx                        # NEW - Danger zone section
│   │   └── DeletedGuildBanner.tsx                # NEW - Deleted banner
│   └── purge/PurgeButton.tsx                     # NEW - Reusable button
└── lib/
    ├── db/schemas/channel.kysely.ts              # Added purge_cooldown
    └── redis/
        ├── jobs.ts                                # Added purge dispatchers
        └── types.ts                               # Added purge job types
```

## Next Steps / Future Enhancements

### Grace Period (Recommended)
- Auto-purge deleted guilds after 30 days
- Scheduled job to clean up
- Warning emails before auto-purge

### Additional Purge Options
- Purge all channels without leaving guild
- Purge failed clips only
- Purge by date range (older than X days)

### Progress Tracking
- Show purge job progress in UI
- Real-time status updates via websockets
- Estimated time remaining

### Recovery Options
- Short undo window (5 minutes?)
- Backup before purge
- Export data before purge

## Testing Checklist

Before deploying to production:

- [ ] Run database migration successfully
- [ ] Restart all services
- [ ] Test guild purge in dev environment
- [ ] Verify bot leaves guild
- [ ] Verify deleted banner shows
- [ ] Verify re-invite button works
- [ ] Test cooldown prevents rapid purges
- [ ] Test cooldown shows remaining time
- [ ] Test PURGE_COOLDOWN_MINUTES=0 disables cooldown
- [ ] Test "Purge All" skips channels on cooldown
- [ ] Test guild purge hard deletes channels
- [ ] Test authorization (non-owners can't purge)
- [ ] Test type-to-confirm works
- [ ] Test scan stopping works
- [ ] Check worker logs for errors
- [ ] Check bot logs for errors

## Troubleshooting

### Purge Job Not Processing
- Check worker logs: `docker logs worker`
- Verify Redis connection
- Check job was queued: Redis CLI `XINFO STREAM jobs:guild:{guild_id}:purge_guild`

### Bot Doesn't Leave Guild
- Check bot logs: `docker logs bot`
- Verify bot has permission to leave
- Check Discord API status

### Deleted Banner Not Showing
- Check `deleted_at` in database
- Verify layout component updated
- Check browser console for errors

## Support

For questions or issues:
1. Check `docs/PURGE_SYSTEM.md` for detailed documentation
2. Review worker/bot logs for errors
3. Test in development environment first
