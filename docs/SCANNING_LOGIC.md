# Scanning Logic Documentation

## Overview

The scanning system processes Discord messages to find and save video clips. This document explains how scans work, how they track progress, and how to use the different scan modes.

## Rescan Modes

The system supports three modes for handling already-processed messages:

### `rescan: "stop"` (Default - Most Efficient)
**When to use:** Normal scans, updates, initial scans

**Behavior:**
- Checks database for existing messages
- Filters out duplicates from processing
- **Stops continuation** when encountering duplicates
- Most efficient - minimizes processing and API calls

### `rescan: "continue"` (Skip & Continue)
**When to use:** Establishing scan boundaries without reprocessing

**Behavior:**
- Checks database for existing messages
- Filters out duplicates from processing
- **Continues scanning** past duplicates
- Useful for filling gaps or correcting scan boundaries
- Lean operation - doesn't reprocess existing data

### `rescan: "update"` (Force Update - Expensive)
**When to use:** After settings changes, forced reprocessing

**Behavior:**
- Checks database for existing messages
- **Processes ALL messages** including duplicates
- Updates clip metadata and settings_hash
- **Never regenerates thumbnails** if they already exist (thumbnail_status="completed")
- Expensive - use sparingly, only when settings have changed

## Scan Types

### 1. Initial Scan (Unscanned or Failed Channels)
**UI Button:** "Scan Unscanned or Failed Channels"

**Parameters:**
```typescript
{
  isUpdate: false,
  isHistorical: false,
  rescan: "stop",
  autoContinue: true
}
```

**Behavior:**
- Uses channel's default `scan_mode` setting (forward/backward)
- Sets BOTH `forward_message_id` and `backward_message_id` on first scan
- Stops when encountering already-scanned messages

### 2. Update Scan (Catch New Messages)
**UI Button:** "Scan and Update All Channels"

**Parameters:**
```typescript
{
  isUpdate: true,
  isHistorical: false,
  rescan: "stop",
  autoContinue: true
}
```

**Behavior:**
- **Always** scans forward from `forward_message_id`
- Updates **ONLY** `forward_message_id` as it progresses
- Stops when encountering already-scanned messages
- Most common for catching up with new messages

### 3. Historical Scan (Establish/Fix Boundaries)
**UI Buttons:** Three modes under "Historical Scan"

#### Normal Historical Scan
```typescript
{
  isUpdate: false,
  isHistorical: true,
  rescan: "stop",
  autoContinue: true
}
```
- Backward scan from channel beginning
- Stops on duplicates
- Most efficient for establishing boundaries

#### Skip Existing Historical Scan  
```typescript
{
  isUpdate: false,
  isHistorical: true,
  rescan: "continue",
  autoContinue: true
}
```
- Backward scan from channel beginning
- Skips duplicates but continues scanning
- Use to establish correct boundaries without reprocessing
- **Recommended for fixing scan IDs**

#### Force Update Historical Scan
```typescript
{
  isUpdate: false,
  isHistorical: true,
  rescan: "update",
  autoContinue: true
}
```
- Backward scan from channel beginning
- Reprocesses all messages including duplicates
- **Expensive!** Use only after settings changes
- Requires confirmation dialog
- Thumbnails never regenerated

## Message ID Tracking

The `ChannelScanStatus` table tracks two message IDs per channel:

### `forward_message_id`
- The **most recent** message we've scanned
- Updated during forward scans and real-time message processing
- Used as starting point for "Update Scan" operations

### `backward_message_id`
- The **oldest** message we've scanned
- Updated during backward scans
- Marks the historical beginning we've reached

### Update Logic

**First Scan (both IDs are null):**
- Sets **BOTH** IDs to establish channel boundaries
- Forward scan: backward_id = first batch's oldest, forward_id = first batch's newest
- Backward scan: forward_id = first batch's newest, backward_id = first batch's oldest

**Continuation Scan (at least one ID exists):**
- Updates **ONLY** the ID for the direction being scanned
- Forward scan: Only updates `forward_message_id`
- Backward scan: Only updates `backward_message_id`
- This preserves the opposite boundary

### Example: Historical Scan with "continue" Mode

```
Problem: Scan IDs are incorrect or missing
forward_message_id: null OR incorrect
backward_message_id: null OR incorrect

Action: Click "Skip Existing (Continue Past Duplicates)"

First batch (backward from newest, messages 5000-4901):
→ forward_message_id: "5000" (newest found)
→ backward_message_id: "4901" (oldest in batch)

Second batch (messages 4900-4801):
→ Finds 30 duplicates, 70 new
→ Processes only the 70 new ones
→ forward_message_id: "5000" (UNCHANGED)
→ backward_message_id: "4801" (UPDATED)
→ Continues scanning (rescan="continue")

Continues until reaching channel beginning:
→ forward_message_id: "5000" (correct - newest message)
→ backward_message_id: "1000" (correct - oldest message)

Result: Boundaries established correctly without reprocessing
```

## Scan Status Flow

```
NULL/FAILED
    ↓
  [User clicks scan]
    ↓
PENDING ← Job queued
    ↓
RUNNING ← Worker processing
    ↓
  [Continuation jobs]
    ↓
SUCCEEDED ← Complete or hit duplicates (stop mode)
```

## Processor Behavior by Rescan Mode

### Stop Mode
```python
if rescan == "stop":
    messages_to_process = [msg for msg in messages if msg.id not in existing_ids]
    if len(messages_to_process) < len(messages):
        stopped_on_duplicate = True  # Don't queue continuation
```

### Continue Mode
```python
elif rescan == "continue":
    messages_to_process = [msg for msg in messages if msg.id not in existing_ids]
    # Don't set stopped_on_duplicate - keep scanning
```

### Update Mode
```python
elif rescan == "update":
    messages_to_process = messages  # Process everything
    # Update clip metadata even if exists
    # Thumbnails still skip if thumbnail_status == "completed"
```

## Thumbnail Behavior

**Important:** Thumbnails are **never** regenerated if they already exist, regardless of rescan mode.

The batch processor checks:
```python
if existing_clip.thumbnail_status == "completed":
    # Skip thumbnail generation
    self.thumbnails_skipped += 1
```

This applies to ALL rescan modes, including "update". Only the clip metadata (settings_hash, CDN URL, etc.) gets updated.

## Use Cases

### Use Case 1: Daily Update
**Scenario:** Check for new messages daily

**Action:** Click "Scan and Update All Channels"

**Result:** Forward scan from last position, stops on duplicates, catches new messages

---

### Use Case 2: Fix Missing Scan IDs
**Scenario:** Channels have messages but missing/incorrect forward/backward IDs

**Action:** Click "Skip Existing (Continue Past Duplicates)" in Historical Scan

**Result:** 
- Backward scan from beginning
- Skips existing messages (lean)
- Continues to establish correct boundaries
- forward_message_id = newest message
- backward_message_id = oldest message reached

---

### Use Case 3: Settings Changed
**Scenario:** Changed clip filtering settings, need to reprocess

**Action:** Click "⚠️ Force Update (Reprocess All)" in Historical Scan (after confirming)

**Result:**
- Backward scan from beginning
- Reprocesses all messages
- Updates clip metadata with new settings
- Thumbnails NOT regenerated
- Expensive but necessary

---

### Use Case 4: First Time Setup
**Scenario:** New channel, never scanned

**Action:** Click "Scan Unscanned or Failed Channels"

**Result:**
- Forward scan from oldest
- Sets both IDs on first batch
- Stops on duplicates (won't find any)
- Establishes complete scan history

## Troubleshooting

### Scan IDs Not Updating
**Cause:** Processor not saving scan status

**Fix:**
- Check worker logs for errors
- Verify database connection
- Ensure update_scan_status is called

### Historical Scan Stops Too Early
**Cause:** Using rescan="stop" mode

**Fix:**
- Use rescan="continue" mode for historical scans
- This skips duplicates but keeps scanning to establish boundaries

### Too Much Reprocessing
**Cause:** Using rescan="update" when not needed

**Fix:**
- Use rescan="stop" for normal scans
- Use rescan="continue" for boundary fixes
- Only use rescan="update" after settings changes

### Thumbnails Not Generating
**Cause:** thumbnail_status already "completed"

**Fix:**
- This is intentional - thumbnails never regenerate
- If you need to regenerate, use thumbnail_retry jobs or manually clear thumbnail records

## Channel Settings

Default channel settings in `settings.default.jsonc`:

```json
{
  "channel_settings_defaults": {
    "scan_mode": "forward",
    "max_messages_per_pass": 1000
  }
}
```

- **"forward"**: Scan from oldest to newest (recommended)
- **"backfill"**: Scan from newest to oldest

## Future Enhancements

1. **Channel-specific scan_mode**: Read from channel settings instead of defaulting
2. **Smart gap detection**: Identify and fill gaps in message history
3. **Selective rescan**: Only reprocess affected clips
4. **Scan analytics**: Track scan runs for debugging
5. **Automatic boundary correction**: Auto-fix incorrect IDs
