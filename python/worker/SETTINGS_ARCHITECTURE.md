# Settings Architecture

## Overview

Settings are **NOT stored in jobs**. They are stored in the database and fetched at processing time using `guild_id` and `channel_id`.

## Database Structure

### GuildSettings Table
```python
class GuildSettings(Model):
    guild = OneToOneField(Guild)
    default_channel_settings = JSONField()  # Default settings for all channels
    settings = JSONField()                   # Guild-level settings
```

### ChannelSettings Table
```python
class ChannelSettings(Model):
    channel = OneToOneField(Channel)
    settings = JSONField()  # Override settings (null = use guild defaults)
```

## Settings Resolution

Settings are resolved with this priority:
1. **Guild defaults** (`GuildSettings.default_channel_settings`)
2. **Channel overrides** (`ChannelSettings.settings`)

### Example

**Guild Settings:**
```json
{
  "default_channel_settings": {
    "allowed_mime_types": ["video/mp4", "video/webm"],
    "match_regex": null,
    "enable_message_content_storage": true
  }
}
```

**Channel Settings (Override):**
```json
{
  "settings": {
    "match_regex": "clip.*"  // Only override this one setting
  }
}
```

**Resolved Settings for Channel:**
```json
{
  "allowed_mime_types": ["video/mp4", "video/webm"],  // From guild
  "match_regex": "clip.*",                             // From channel override
  "enable_message_content_storage": true               // From guild
}
```

## How Jobs Work

### Job Schema (Simplified)
```python
class BaseJob(BaseModel):
    job_id: str
    type: str
    guild_id: str      # Used to fetch settings
    channel_id: str    # Used to fetch settings
    created_at: datetime
    # NO settings field!
```

### Processing Flow

1. **Job is created** (by interface or bot)
   ```python
   job = BatchScanJob(
       guild_id="928427413694734396",
       channel_id="1424914917202464798",
       direction="backward",
       limit=100
   )
   ```

2. **Job is pushed to Redis**
   ```python
   await redis_client.push_job(job.model_dump(mode='json'))
   ```

3. **Worker receives job**
   ```python
   jobs = await redis_client.read_jobs(count=1, block=5000)
   ```

4. **Worker fetches settings from database**
   ```python
   from shared.settings_resolver import get_channel_settings
   
   settings = await get_channel_settings(
       guild_id=job_data['guild_id'],
       channel_id=job_data['channel_id']
   )
   ```

5. **Worker processes message with current settings**
   ```python
   clips_found = await message_handler.process_message(
       discord_message=discord_message,
       channel_id=channel_id,
       guild_id=guild_id,
       thumbnail_generator=thumbnail_generator
   )
   # message_handler fetches settings internally
   ```

## Benefits

### ✅ Always Uses Current Settings
Jobs use the **current** settings at processing time, not stale settings from when the job was created.

### ✅ No Settings Duplication
Settings are stored once in the database, not duplicated in every job.

### ✅ Easy Settings Updates
When a user changes settings:
1. Update `GuildSettings` or `ChannelSettings` in database
2. All future job processing uses new settings automatically
3. No need to update existing jobs in Redis

### ✅ Settings History
Can track settings changes in the database (add `updated_at` timestamps).

## Settings Resolver API

### Fetch Channel Settings
```python
from shared.settings_resolver import get_channel_settings

settings = await get_channel_settings(guild_id="123", channel_id="456")

# Access settings
print(settings.allowed_mime_types)  # ['video/mp4', 'video/webm']
print(settings.match_regex)         # 'clip.*'
print(settings.enable_message_content_storage)  # True

# Get as dict
settings_dict = settings.to_dict()
```

### Fetch Guild Defaults Only
```python
from shared.settings_resolver import get_guild_default_settings

settings = await get_guild_default_settings(guild_id="123")
```

## Settings Hash for Invalidation

Settings hash is computed and stored with each clip to detect when settings change:

```python
import json
import hashlib

settings_hash = hashlib.md5(
    json.dumps(settings.to_dict(), sort_keys=True).encode()
).hexdigest()

# Store with clip
await Clip.create(
    id=clip_id,
    settings_hash=settings_hash,
    ...
)
```

When processing a clip:
- If `clip.settings_hash == current_settings_hash`: Skip (already processed with same settings)
- If different: Reprocess (settings changed)

## Migration Notes

### Old Way (WRONG)
```python
# ❌ Settings embedded in job
job = BatchScanJob(
    guild_id="123",
    channel_id="456",
    settings=JobSettings(
        allowed_mime_types=["video/mp4"],
        match_regex="clip.*"
    )
)
```

### New Way (CORRECT)
```python
# ✅ No settings in job
job = BatchScanJob(
    guild_id="123",
    channel_id="456"
)

# Settings fetched at processing time
settings = await get_channel_settings(
    guild_id=job_data['guild_id'],
    channel_id=job_data['channel_id']
)
```

## Files Changed

1. **`worker/redis/redis.py`** - Removed `JobSettings` class, removed `settings` field from jobs
2. **`shared/settings_resolver.py`** - NEW: Helper to fetch and resolve settings
3. **`worker/message/message_handler.py`** - Fetches settings from database instead of parameter
4. **`worker/processor.py`** - Removed `settings` parameter from all process methods

## Testing

To test the settings system:

1. **Create guild settings in database:**
   ```python
   from shared.db.repositories.guild_settings import upsert_guild_settings
   
   await upsert_guild_settings(
       gid="928427413694734396",
       guild_settings={},
       channel_settings={
           "allowed_mime_types": ["video/mp4", "video/webm"],
           "match_regex": None,
           "enable_message_content_storage": True
       }
   )
   ```

2. **Create a job (no settings):**
   ```python
   job = BatchScanJob(
       guild_id="928427413694734396",
       channel_id="1424914917202464798",
       direction="backward",
       limit=100
   )
   ```

3. **Worker will fetch settings automatically** when processing the job
