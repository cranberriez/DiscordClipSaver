# Purge System

Complete documentation for the guild and channel purge system.

## Overview

The purge system provides destructive operations for removing clips, messages, thumbnails, and related data. It implements a clean separation between bot events (guild removal) and user-initiated purge actions.

## Architecture

### Two Independent Paths

**Path 1: Bot Leaves/Kicked (Discord Event)**
- Bot receives `on_guild_remove` event from Discord
- Guild is soft-deleted (`deleted_at` timestamp set)
- All active scans are stopped
- Data is preserved (no purge)
- User can re-invite bot to restore access

**Path 2: User Initiates Purge (Interface)**
- User clicks purge button in settings
- Purge job queued in Redis
- Worker deletes all files and data
- Guild is soft-deleted
- Bot leaves the guild

### Job Types

**PurgeChannelJob**
- Deletes all clips, messages, and thumbnails for a single channel
- Deletes thumbnail files from storage
- Deletes channel scan status (scan metadata becomes invalid)
- Sets `purge_cooldown` on channel (default: 5 minutes, configurable via env var)
- Channel itself is NOT deleted (allows re-scanning after cooldown)

**PurgeGuildJob**
- Deletes all clips, messages, and thumbnails for entire guild
- Deletes all thumbnail files from storage
- Deletes all channel scan statuses for guild
- Hard deletes all channels for the guild
- Soft deletes guild (`deleted_at` timestamp)
- Bot leaves the guild via Discord API

## Database Schema

### Channel Model
```python
purge_cooldown = fields.DatetimeField(null=True)  # Prevent abuse
```

### Guild Model
```python
deleted_at = fields.DatetimeField(null=True)  # Soft delete
```

## API Routes

### POST /api/guilds/[guildId]/channels/[channelId]/purge
Purge a single channel.

**Authorization:** Guild ownership required

**Validation:**
- Checks `purge_cooldown` timestamp
- Returns 429 if cooldown active
- Cooldown defaults to 5 minutes (configurable via PURGE_COOLDOWN_MINUTES env var)

**Response:**
```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Channel purge job queued"
}
```

### POST /api/guilds/[guildId]/purge
Purge entire guild and leave it.

**Authorization:** Guild ownership required

**Validation:**
- Checks guild not already deleted
- Returns clip count for confirmation

**Response:**
```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Guild purge job queued - bot will leave the guild",
  "stats": {
    "clips_to_delete": 1234
  }
}
```

## Worker Implementation

### PurgeHandler
Located: `python/worker/purge/purge_handler.py`

**purge_channel(guild_id, channel_id)**
1. Get all clips for channel
2. Delete thumbnail files from storage
3. Hard delete thumbnails from database
4. Hard delete clips from database
5. Hard delete messages from database
6. Delete channel scan status (invalidates scan metadata)
7. Set `purge_cooldown` on channel (reads PURGE_COOLDOWN_MINUTES env var, default 5)

**purge_guild(guild_id)**
1. Get all clips for guild
2. Delete thumbnail files from storage
3. Hard delete thumbnails from database
4. Hard delete clips from database
5. Hard delete messages from database
6. Delete all channel scan statuses for guild
7. Hard delete all channels for guild
8. Soft delete guild (`deleted_at` timestamp)
9. Leave guild via bot

### Scan Stop Mechanism

**_stop_channel_scan(guild_id, channel_id)**
- Sets scan status to CANCELLED
- Error message: "Scan stopped due to channel purge"

**_stop_guild_scans(guild_id)**
- Finds all running scans for guild
- Sets all to CANCELLED
- Error message: "Scan stopped due to guild purge"

## UI Components

### PurgeButton
Reusable component for purge operations.

**Features:**
- Type-to-confirm safety (user must type confirmation text)
- Loading states
- Error handling
- Customizable text and stats

**Example:**
```tsx
<PurgeButton
  label="Purge Guild"
  title="Purge Guild"
  description="This will delete all data..."
  confirmText="DELETE GUILD"
  onConfirm={handlePurge}
  stats="This will delete 1,234 clips"
  variant="destructive"
/>
```

### DangerZone
Settings section for destructive operations.

**Location:** Guild Settings page

**Features:**
- Warning styling (red border, alert icon)
- Clear descriptions of consequences
- Only shown if guild not deleted
- **Three purge levels:**
  - Purge specific channel (dropdown selector with clip counts)
  - Purge all channels (without leaving guild)
  - Purge guild (delete everything and leave)

### DeletedGuildBanner
Banner shown when guild is marked deleted.

**Features:**
- Shows deletion timestamp
- Explains bot was removed
- "Re-Invite Bot" button (links to install flow)
- "Back to Dashboard" button

## Safety Features

### Purge Cooldown
- Prevents rapid repeated channel purges
- Default: 5 minutes (configurable via PURGE_COOLDOWN_MINUTES)
- Checked before queueing job
- Returns 429 if cooldown active
- Set to 0 or negative to disable for testing
- "Purge All Channels" skips channels on cooldown and continues with others

### Authorization
- All purge endpoints require authentication
- Guild ownership required (not just Discord access)
- Uses `requireGuildAccess(req, guildId, true)`

### Confirmation
- Type-to-confirm in UI (must type exact text)
- No accidental clicks
- Clear warning messages

### Soft Delete
- Guild is soft-deleted (not hard-deleted)
- Audit trail preserved
- Can implement grace period later

## Bot Event Handling

### on_guild_remove
Located: `python/bot/services/guild_service.py`

**Behavior:**
1. Stop all active scans for guild
2. Soft delete guild (`deleted_at` timestamp)
3. Log removal event

**Triggered by:**
- Bot kicked from guild
- Bot leaves guild programmatically (after purge)

**Note:** Idempotent - safe to call multiple times

## Testing Checklist

- [ ] Channel purge deletes all clips and files
- [ ] Channel purge sets cooldown
- [ ] Cooldown prevents rapid purges (returns 429)
- [ ] Cooldown displays remaining time in error message
- [ ] "Purge All" skips channels on cooldown
- [ ] "Purge All" shows summary of succeeded/skipped/failed
- [ ] Setting PURGE_COOLDOWN_MINUTES=0 disables cooldown
- [ ] Guild purge deletes all data
- [ ] Guild purge hard deletes all channels
- [ ] Guild purge makes bot leave
- [ ] Bot leave event sets deleted_at
- [ ] Deleted guild banner shows correctly
- [ ] Re-invite button works
- [ ] Scans stop on purge
- [ ] Authorization checks work
- [ ] Type-to-confirm prevents accidents
- [ ] Non-owners cannot purge

## Future Enhancements

### Grace Period
- Auto-purge deleted guilds after 30 days
- Scheduled job to clean up old deleted guilds

### Additional Purge Levels
- Purge failed clips only
- Purge by date range
- Purge all channels (without leaving guild)

### Progress Tracking
- Show purge job progress in UI
- Estimated time remaining
- Real-time status updates

### Undo/Restore
- Short window to cancel purge
- Backup before purge (optional)

## Migration

### SQL Migration
```sql
-- purge_cooldown already exists on channel table
-- deleted_at already exists on guild table
-- Verify they exist:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name='channel' AND column_name='purge_cooldown';
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name='guild' AND column_name='deleted_at';
```

## Environment Variables

### PURGE_COOLDOWN_MINUTES
- **Default:** 5
- **Description:** Minutes to wait between channel purges
- **Set to 0:** Disables cooldown entirely (useful for testing)
- **Location:** Add to `.env.global` or environment

```bash
# Example configurations
PURGE_COOLDOWN_MINUTES=5    # Default: 5 minute cooldown
PURGE_COOLDOWN_MINUTES=0    # Disable cooldown for testing
PURGE_COOLDOWN_MINUTES=60   # 1 hour cooldown for production
```

### Model Updates
- `python/shared/db/models.py` - Updated Channel model
- `interface/src/lib/db/schemas/channel.kysely.ts` - Updated TypeScript schema

## Related Files

**Worker:**
- `python/worker/purge/purge_handler.py` - Purge logic
- `python/worker/processor.py` - Job routing

**Bot:**
- `python/bot/services/guild_service.py` - Event handling

**API:**
- `interface/src/app/api/guilds/[guildId]/purge/route.ts`
- `interface/src/app/api/guilds/[guildId]/channels/[channelId]/purge/route.ts`

**UI:**
- `interface/src/components/purge/PurgeButton.tsx`
- `interface/src/components/guild/DangerZone.tsx`
- `interface/src/components/guild/DeletedGuildBanner.tsx`

**Types:**
- `python/shared/redis/redis.py` - Job schemas
- `interface/src/lib/redis/types.ts` - TypeScript job types
- `interface/src/lib/redis/jobs.ts` - Job dispatchers
