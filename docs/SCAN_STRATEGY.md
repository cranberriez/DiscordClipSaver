# Channel Scanning Strategy

## Overview

This document explains the automatic channel scanning system, message ID tracking, and bot message handling strategy.

---

## Scan Status Fields

### `message_count`

**Represents:** The number of messages that contain clips (videos/attachments matching your criteria).

-   This is **NOT** the total messages scanned
-   Only incremented when a message has clips that were saved to the database
-   Used for UI display: "Found 42 clips across 15 messages"

### `total_messages_scanned`

**Represents:** The total number of Discord messages examined during scanning.

-   Incremented for every message fetched from Discord, regardless of whether it has clips
-   Used for progress tracking and statistics
-   Example: Scanned 1000 messages, found clips in 15 of them
    -   `total_messages_scanned = 1000`
    -   `message_count = 15`

---

## Message ID Tracking

### `forward_message_id`

-   **Stores:** The most recent message ID scanned when going forward (newer messages)
-   **Used for:** Continuing forward scans from where we left off
-   **Updated by:** Worker after processing a forward batch
-   **Used in jobs:** Set as `after_message_id` for next forward scan

### `backward_message_id`

-   **Stores:** The oldest message ID scanned when going backward (historical messages)
-   **Used for:** Continuing backward scans from where we left off
-   **Updated by:** Worker after processing a backward batch
-   **Used in jobs:** Set as `before_message_id` for next backward scan

---

## Automatic Scan Continuation

### The `auto_continue` Flag

Controls whether the worker automatically queues continuation jobs:

-   **`auto_continue: true`** (default) - Worker queues next batch automatically until channel is fully scanned
-   **`auto_continue: false`** - Worker processes only the specified batch, then stops

### Use Cases

**Set `auto_continue: true` for:**

-   Historical backfill when channel is first enabled
-   "Scan Channel" button in interface
-   Scheduled periodic catch-up scans
-   Any scenario where you want complete channel coverage

**Set `auto_continue: false` for:**

-   Quick preview/sampling (e.g., "Show me last 100 messages")
-   Testing/debugging
-   Rate limit management (manual batch control)
-   Resource-constrained environments

### How It Works

1. **Interface creates initial job:**

    ```json
    {
        "type": "batch",
        "guild_id": "123",
        "channel_id": "456",
        "direction": "backward",
        "limit": 100,
        "before_message_id": null, // Start from most recent
        "auto_continue": true // Enable automatic continuation
    }
    ```

2. **Worker processes batch:**

    - Fetches 100 messages
    - Processes each message for clips
    - Updates `backward_message_id` to the oldest message processed
    - **If batch is full (100 messages):** Automatically queues continuation job

3. **Worker queues continuation (if `auto_continue: true`):**

    ```json
    {
        "type": "batch",
        "guild_id": "123",
        "channel_id": "456",
        "direction": "backward",
        "limit": 100,
        "before_message_id": "oldest_message_id_from_previous_batch",
        "auto_continue": true // Preserved from original job
    }
    ```

4. **Process repeats until:**
    - Fewer than `limit` messages returned (reached end of channel)
    - `auto_continue` is `false`
    - Scan is cancelled
    - Error occurs

### Benefits

-   **Zero interface involvement:** Interface just creates the first job
-   **Resilient:** Each batch is a separate job, failures don't break the entire scan
-   **Pausable:** Can stop/restart without losing progress
-   **Trackable:** `backward_message_id` and `forward_message_id` show exact progress

---

## Gap Detection on Bot Startup

### The Problem

When the bot restarts, it may have missed messages. How do we detect and fill these gaps?

### Solution: Automatic Gap Detection

**On bot startup (`on_ready` event):**

1. **Query enabled channels:**

    - Get all guilds with `message_scan_enabled=True`
    - Get all channels with `message_scan_enabled=True`

2. **For each enabled channel:**

    - Check `channel_scan_status.forward_message_id` (last known message)
    - Fetch latest message from Discord channel
    - Compare IDs

3. **If gap detected:**

    - Queue a forward `BatchScanJob` with:
        - `after_message_id` = last known message ID
        - `auto_continue=True` (scan until caught up)
        - `direction="forward"`

4. **Result:**
    - Bot automatically catches up on all missed messages
    - No manual intervention needed
    - Happens once per bot restart

### Example Gap Detection Flow

```
Bot was offline from 10:00 AM to 2:00 PM

Channel scan status:
  forward_message_id: "1234567890"  (last message at 10:00 AM)

Bot starts at 2:00 PM:
  Latest message in channel: "1234567999"  (message at 1:45 PM)

Gap detected! Queue job:
  {
    "type": "batch",
    "direction": "forward",
    "after_message_id": "1234567890",
    "auto_continue": true
  }

Worker processes:
  - Scans messages from 10:00 AM to 1:45 PM
  - Updates forward_message_id to "1234567999"
  - Channel is now caught up
```

---

## Real-time Message Tracking

### The Problem

When the bot receives new messages in real-time, how do we prevent gap detection from re-scanning them?

### Solution: Worker Updates `forward_message_id`

**For real-time messages (`MessageScanJob`):**

1. Worker processes the message(s)
2. Worker finds the newest message ID (snowflakes are sortable - larger = newer)
3. Worker compares with current `forward_message_id`
4. If newer, updates `forward_message_id`

**Example:**

```
Current state:
  forward_message_id = "1000"

New message arrives: "1005"
Bot queues MessageScanJob

Worker processes:
  - Checks: 1005 > 1000? Yes
  - Updates forward_message_id = "1005"

Bot restarts:
  - Latest message in channel: "1005"
  - forward_message_id: "1005"
  - No gap detected ✅
```

### Edge Cases Handled

**Case 1: Channel never batch scanned**

```
forward_message_id = null
New message: "100"
Worker updates forward_message_id = "100"
Gap detection now works for future messages ✅
```

**Case 2: Out-of-order messages**

```
forward_message_id = "1000"
Old message processed: "995"
Worker checks: 995 > 1000? No
Does NOT update forward_message_id ✅
```

**Case 3: Multiple messages in one job**

```
Message IDs: ["1001", "1003", "1002"]
Worker finds max: "1003"
Updates forward_message_id = "1003" ✅
```

---

## Bot Message Handling Strategy

### The Problem

When the bot receives a new message, should it:

1. Check database settings immediately?
2. Perform quick checks and delegate to worker?

### Recommended Approach: **Lightweight Bot + Worker Validation**

#### Bot's Responsibility (Minimal)

```python
async def on_message(message):
    # Quick checks only (no database queries)
    if message.author.bot:
        return

    if not message.attachments:
        return

    # Has attachments - queue for worker to handle
    job = MessageScanJob(
        guild_id=str(message.guild.id),
        channel_id=str(message.channel.id),
        message_ids=[str(message.id)]
    )

    await redis_client.push_job(job.model_dump(mode='json')) # model_dump(mode='json') is required for pydantic models
```

#### Worker's Responsibility (Full Validation)

```python
async def process_message_scan(job_data):
    # Worker does ALL database checks:
    # 1. Check guild.message_scan_enabled
    # 2. Check channel.message_scan_enabled
    # 3. Fetch and apply settings (filters, mime types, etc.)
    # 4. Process message if all checks pass

    is_enabled, error = await validate_scan_enabled(guild_id, channel_id)
    if not is_enabled:
        # Silently skip - don't update scan status for real-time messages
        return

    # Fetch settings from database
    settings = await get_merged_settings(guild_id, channel_id)

    # Apply filters and process
    await process_message_with_settings(message, settings)
```

### Why This Approach?

#### ✅ Advantages

1. **Bot stays fast:**

    - No database queries on every message
    - Only checks: is bot? has attachments?
    - Can handle high message volume

2. **Settings always fresh:**

    - Worker fetches settings from database each time
    - No caching issues
    - Settings changes apply immediately

3. **Centralized validation:**

    - All scan logic in one place (worker)
    - Easier to maintain and debug
    - Consistent behavior for batch and real-time scans

4. **Resilient:**

    - If worker is down, jobs queue up
    - When worker returns, processes backlog
    - No lost messages

5. **Scalable:**
    - Multiple workers can process jobs in parallel
    - Bot doesn't become a bottleneck

#### ⚠️ Considerations

1. **Slight delay:**

    - Message → Job → Worker → Processing
    - Typically <1 second, acceptable for real-time scanning

2. **Redis dependency:**
    - Bot needs Redis connection
    - If Redis is down, messages are lost (but this is already a dependency)

---

## Settings Change Handling

### When User Changes Settings

**Interface creates a RescanJob:**

```json
{
    "type": "rescan",
    "guild_id": "123",
    "channel_id": "456",
    "reason": "settings_changed",
    "reset_scan_status": false
}
```

**Worker behavior:**

-   Fetches ALL messages from channel (or uses existing clips)
-   Re-applies new settings to determine which clips should exist
-   Updates/removes clips based on new criteria
-   Does NOT need to re-download videos (clips table already has metadata)

### Settings Invalidation

The `Clip` model has a `settings_hash` field:

```python
settings_hash = fields.CharField(max_length=32, null=True)
```

**Strategy:**

1. When processing a message, compute hash of settings used
2. Store hash with each clip
3. On settings change, compare new hash with stored hash
4. Only reprocess clips where hash differs

This allows **selective rescanning** instead of full channel rescans.

---

## Bot Settings Caching Strategy

### Option 1: No Caching (Recommended for Now)

-   Worker fetches settings from database for each message
-   Simple, always correct
-   Database query overhead is minimal for modern DBs

### Option 2: Redis Cache (Future Optimization)

```python
# Cache settings in Redis with TTL
settings_key = f"settings:{guild_id}:{channel_id}"
cached_settings = await redis.get(settings_key)

if not cached_settings:
    settings = await fetch_from_database(guild_id, channel_id)
    await redis.setex(settings_key, 300, json.dumps(settings))  # 5 min TTL
```

**Invalidation:**

-   Interface invalidates cache when settings change
-   TTL provides fallback if invalidation fails

### Option 3: In-Memory Cache (Not Recommended)

-   Each worker has its own cache
-   Cache invalidation becomes complex
-   Stale settings risk

---

## Scan Status Lifecycle

### Initial State (Channel First Enabled)

```
status: QUEUED
forward_message_id: null
backward_message_id: null
message_count: 0
total_messages_scanned: 0
```

### During Historical Scan (Backward)

```
status: RUNNING
backward_message_id: "1234567890"  # Updates each batch
message_count: 15
total_messages_scanned: 500
```

### Scan Complete

```
status: SUCCEEDED
backward_message_id: "oldest_message_in_channel"
forward_message_id: "newest_message_in_channel"
message_count: 42
total_messages_scanned: 10000
```

### Scan Disabled Mid-Process

```
status: CANCELLED
error_message: "Channel scanning disabled for this channel"
backward_message_id: "1234567890"  # Preserves progress
```

### Scan Failed

```
status: FAILED
error_message: "Discord API rate limit exceeded"
backward_message_id: "1234567890"  # Preserves progress
```

---

## Summary

### Worker Handles:

-   ✅ All database queries
-   ✅ Settings fetching and application
-   ✅ Message ID tracking
-   ✅ Automatic scan continuation
-   ✅ Scan status updates

### Bot Handles:

-   ✅ Quick attachment checks
-   ✅ Job creation
-   ✅ Staying responsive

### Interface Handles:

-   ✅ Creating initial scan jobs
-   ✅ Displaying scan status
-   ✅ User settings management
-   ✅ **Nothing else during scans** (fully automatic)
