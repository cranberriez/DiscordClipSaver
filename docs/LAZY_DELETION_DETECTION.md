# Lazy Deletion Detection

## Overview

**Lazy deletion detection** automatically discovers and cleans up clips that were deleted from Discord while the bot was offline. This works **reactively** when users interact with clips, rather than proactively scanning for deletions.

## The Problem

Discord bots have a fundamental limitation:
- ✅ **Bot online** → Receives `on_raw_message_delete` events
- ❌ **Bot offline** → Deletion events are lost forever (not queued or replayed)
- ❌ **No catch-up mechanism** when bot restarts

This means clips deleted while the bot is offline remain in your database as "zombie" records with broken CDN URLs.

## The Solution: Lazy Detection

Instead of proactively checking every clip, we detect deletions **reactively** when users try to view them:

```
User clicks clip → CDN URL expired → Request refresh → Message not found → Queue cleanup
```

### Flow Diagram

```
┌─────────────┐
│ User clicks │
│    clip     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Interface   │ Check: Is CDN URL expired?
│ checks URL  │ Yes → Auto-refresh
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Interface API    │ POST /api/clips/:id/refresh-cdn
│ calls bot API    │ 
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Bot FastAPI      │ Try: Fetch message from Discord
│ fetches message  │
└──────┬───────────┘
       │
       ├─────────► Message exists ──► Return fresh CDN URL ──► Play video ✅
       │
       └─────────► Message deleted (404)
                   │
                   ▼
                ┌──────────────────────┐
                │ Queue deletion job   │
                │ to Redis queue       │
                └──────┬───────────────┘
                       │
                       ▼
                ┌──────────────────────┐
                │ Return 410 Gone      │
                │ error_type:          │
                │ MESSAGE_DELETED      │
                └──────┬───────────────┘
                       │
                       ▼
                ┌──────────────────────┐
                │ Interface displays:  │
                │ "Clip Deleted" 🗑️    │
                └──────────────────────┘
                       │
                       ▼
                ┌──────────────────────┐
                │ Worker picks up job  │
                │ Deletes: Message,    │
                │ Clips, Thumbnails,   │
                │ Files from storage   │
                └──────────────────────┘
```

## Implementation

### 1. Bot FastAPI Endpoint (`python/bot/api.py`)

When CDN refresh fails with 404:

```python
@api.post("/refresh-cdn")
async def refresh_cdn_url(request: RefreshCdnRequest):
    try:
        message = await channel.fetch_message(int(request.message_id))
    except discord.NotFound:
        # Message deleted! Queue cleanup job
        scan_service = get_scan_service()
        await scan_service.handle_message_deletion(
            guild_id=str(channel.guild.id),
            channel_id=request.channel_id,
            message_id=request.message_id
        )
        
        # Return specific error type
        raise HTTPException(
            status_code=410,  # 410 Gone - permanently deleted
            detail={
                "error_type": "MESSAGE_DELETED",
                "message": "This clip was deleted from Discord"
            }
        )
```

**Key Points:**
- ✅ Queues deletion job to Redis (async cleanup)
- ✅ Returns **410 Gone** (not 404) - semantically correct
- ✅ Includes `error_type` for structured error handling
- ✅ Doesn't block on cleanup - returns immediately

### 2. Interface API Route (`interface/src/app/api/clips/[clipId]/refresh-cdn/route.ts`)

Passes through the deletion error:

```typescript
if (response.status === 410 && errorData.detail?.error_type === "MESSAGE_DELETED") {
    return NextResponse.json(
        { 
            error_type: "MESSAGE_DELETED",
            error: errorData.detail.message || "This clip was deleted from Discord"
        },
        { status: 410 }
    );
}
```

**Key Points:**
- ✅ Recognizes `MESSAGE_DELETED` error type
- ✅ Passes through to frontend with 410 status
- ✅ Preserves error message for display

### 3. ClipModal UI (`interface/src/components/clips/ClipModal.tsx`)

Displays deletion gracefully:

```typescript
const refreshCdnUrl = useCallback(async () => {
    const response = await fetch(`/api/clips/${clip.id}/refresh-cdn`, { method: "POST" });
    
    if (!response.ok) {
        const errorData = await response.json();
        
        // Check for deletion
        if (response.status === 410 && errorData.error_type === "MESSAGE_DELETED") {
            setIsDeleted(true);
            setDeletionMessage(errorData.error);
            return; // Don't show alert, just update state
        }
        
        // Handle other errors...
    }
}, [clip.id]);
```

**UI Display:**

```jsx
{isDeleted ? (
    <div className="aspect-video bg-destructive/10 border-2 border-destructive/20 rounded-lg">
        <div className="text-destructive text-5xl">🗑️</div>
        <p className="text-destructive font-semibold">Clip Deleted</p>
        <p className="text-destructive/80">{deletionMessage}</p>
        <p className="text-muted-foreground text-xs">
            The original Discord message was deleted. This clip will be removed automatically.
        </p>
    </div>
) : (
    <VideoPlayer src={videoUrl} />
)}
```

**Key Points:**
- ✅ No ugly alert() popup
- ✅ Clean visual feedback with icon
- ✅ Explains what happened and what will happen
- ✅ User-friendly, not technical

## Advantages

### ✅ Pros

1. **Automatic Discovery** - No manual intervention needed
2. **No API Abuse** - Only checks when user requests
3. **Natural Rate Limiting** - User-triggered, not bot-triggered
4. **Clean UI** - Graceful error handling, not technical errors
5. **Async Cleanup** - Doesn't block user interaction
6. **Works Retroactively** - Cleans up old deletions over time

### ⚠️ Cons

1. **Delayed Detection** - Only when clip is viewed
2. **Never-Viewed Clips** - Remain in database forever
3. **Storage Waste** - Thumbnails for unviewed deleted clips persist

## Trade-offs vs. Alternatives

| Approach | API Cost | Detection Speed | Completeness | Risk |
|----------|----------|-----------------|--------------|------|
| **Lazy Detection** | ✅ Minimal | ⚠️ On-demand | ⚠️ Partial | ✅ Safe |
| Periodic Scanning | ❌ Very High | ✅ Regular | ✅ Complete | ❌ Ban Risk |
| Audit Log Polling | ⚠️ Medium | ⚠️ Delayed | ⚠️ Limited | ✅ Safe |
| Accept Limitation | ✅ None | ❌ Never | ❌ None | ✅ Safe |

## Statistics & Monitoring

To track lazy deletion effectiveness, you could add:

```sql
-- Count clips with expired CDN URLs (potential deletions)
SELECT COUNT(*) FROM clip 
WHERE expires_at < NOW() 
  AND deleted_at IS NULL;

-- Count clips deleted via lazy detection today
SELECT COUNT(*) FROM clip 
WHERE deleted_at >= NOW() - INTERVAL '1 day';
```

## User Experience

### Before (Without Lazy Detection)

1. User clicks expired clip
2. Video player shows playback error
3. User clicks "Retry" → Same error
4. User frustrated, gives up
5. **Zombie clip remains in database forever**

### After (With Lazy Detection)

1. User clicks expired clip
2. Auto-refresh detects deletion
3. Clean "🗑️ Clip Deleted" message shown
4. User understands what happened
5. **Clip automatically queued for cleanup**

## Future Enhancements

### Possible Improvements

1. **Batch Lazy Detection** - Check all clips in channel when one is deleted
2. **Audit Log Hybrid** - Combine with audit log scanning for recent deletions
3. **Deletion Analytics** - Track which users/channels delete clips most
4. **Smart Prefetch** - Check popular clips proactively (low volume)
5. **Grid View Detection** - Check clips when thumbnail grid loads (optional)

### Not Recommended

❌ **Proactive full scan** - API abuse risk  
❌ **Aggressive checking** - Discord rate limits  
❌ **Keep zombie clips** - Just wastes space

## Testing

### Manual Test

1. Post a video clip in Discord
2. Wait for bot to process it
3. View clip in interface (should work)
4. Delete message in Discord
5. Click clip again in interface
6. **Expected:** See "Clip Deleted" message, not playback error
7. **Verify:** Check worker logs for deletion job processing

### Automated Test

```typescript
// Test lazy deletion flow
it('should detect and handle deleted clips', async () => {
    // 1. Setup: Clip exists
    const clip = await createTestClip();
    
    // 2. Simulate: Discord message deleted (bot returns 410)
    mockBotApi.post('/refresh-cdn').reply(410, {
        error_type: 'MESSAGE_DELETED',
        message: 'Clip was deleted'
    });
    
    // 3. User tries to refresh
    const response = await fetch(`/api/clips/${clip.id}/refresh-cdn`, { method: 'POST' });
    
    // 4. Verify: Returns 410 with error type
    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.error_type).toBe('MESSAGE_DELETED');
    
    // 5. Verify: Deletion job queued to Redis
    expect(redisQueue).toHaveJob({ type: 'message_deletion', message_id: clip.message_id });
});
```

## Related Documentation

- `docs/MESSAGE_DELETION.md` - Full deletion system architecture
- `docs/EVENT_HANDLERS.md` - Real-time deletion detection (bot online)
- `docs/CLIPS_VIEWER.md` - CDN URL refresh mechanism
