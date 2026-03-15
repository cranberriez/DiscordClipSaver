# Hardcoded Values Analysis

## Current Issues Found

### 1. MIME Types and Video Extensions Mismatch

**Settings File (`settings.default.jsonc`):**
```json
"mime_allowlist": ["video/mp4", "video/quicktime", "video/webm"]
```

**Python Code Supports More:**
- `worker/message/validators.py`: `{'.mp4', '.mov', '.webm', '.avi', '.mkv', '.flv', '.wmv'}`
- `worker/message/utils.py`: `{'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'mkv': 'video/x-matroska', 'flv': 'video/x-flv', 'm4v': 'video/x-m4v'}`
- `shared/settings_resolver.py`: `['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']`

**Problem:** Settings file is more restrictive than what the code actually supports.

### 2. Thumbnail Generation Settings (Hardcoded)

**Hardcoded in `worker/thumbnail/thumbnail_handler.py`:**
- Retry backoff schedule: `[5, 15, 60, 240, 720, 1440]` minutes
- Retry batch limit: `10` thumbnails at once
- Stale thumbnail timeout: `30` minutes default

**Hardcoded in `worker/thumbnail/thumbnail_generator.py`:**
- Download timeout: `300` seconds (5 minutes) via env var
- Connect timeout: `10` seconds via env var
- Default thumbnail timestamp: `1.0` seconds via env var

### 3. Job Processing Settings (Hardcoded)

**Hardcoded in `worker/processor.py`:**
- Default batch limit: `100` messages
- Default direction: `"backward"`

**Hardcoded in `worker/main.py`:**
- Job batch size: `10` jobs via env var
- Redis block timeout: `5000` ms (5 seconds)
- Bot ready timeout: `30.0` seconds
- Stale scan cleanup interval: `300` seconds (5 minutes) via env var
- Stale scan timeout: `30` minutes via env var
- Stale thumbnail cleanup interval: `3600` seconds (1 hour) via env var
- Stale thumbnail timeout: `60` minutes via env var

### 4. Database Health Check Settings (Hardcoded)

**Hardcoded in `worker/main.py`:**
- DB health check interval: `60` seconds via env var

### 5. Fallback Values in Code

**Multiple files have hardcoded fallbacks:**
- `worker/message/validators.py`: `['video/mp4', 'video/quicktime', 'video/webm']`
- `worker/settings_utilities.py`: `["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]`

## Recommended Settings File Updates

### Add New Sections to `settings.default.jsonc`

```json
{
    "guild_settings_defaults": {
        // ... existing settings ...
    },
    
    "channel_settings_defaults": {
        // ... existing settings ...
        // UPDATE: Expand MIME types to match what code supports
        "mime_allowlist": [
            "video/mp4", 
            "video/quicktime", 
            "video/webm",
            "video/x-msvideo",      // .avi
            "video/x-matroska",     // .mkv
            "video/x-flv",          // .flv
            "video/x-m4v"           // .m4v
        ],
        // ADD: Video extensions for fallback detection
        "video_extensions": [".mp4", ".mov", ".webm", ".avi", ".mkv", ".flv", ".wmv", ".m4v"]
    },
    
    // ADD: New worker settings section
    "worker_settings_defaults": {
        // Job Processing
        "default_batch_limit": 100,
        "default_scan_direction": "backward",
        "job_batch_size": 10,
        "redis_block_timeout_ms": 5000,
        "bot_ready_timeout_seconds": 30.0,
        
        // Thumbnail Generation
        "thumbnail_timestamp_seconds": 1.0,
        "video_download_timeout_seconds": 300,
        "video_download_connect_timeout_seconds": 10,
        "thumbnail_retry_backoff_minutes": [5, 15, 60, 240, 720, 1440],
        "thumbnail_retry_batch_limit": 10,
        "thumbnail_stale_timeout_minutes": 30,
        
        // Cleanup and Maintenance
        "stale_scan_cleanup_interval_seconds": 300,
        "stale_scan_timeout_minutes": 30,
        "stale_thumbnail_cleanup_interval_seconds": 3600,
        "stale_thumbnail_timeout_minutes": 60,
        "db_health_check_interval_seconds": 60
    },
    
    "database_settings_defaults": {
        // ... existing settings ...
    },
    
    "user_facing_settings_defaults": {
        // ... existing settings ...
    }
}
```

## Files That Need Updates

### Python Files to Update:
1. `worker/thumbnail/thumbnail_handler.py` - Use settings for retry logic
2. `worker/thumbnail/thumbnail_generator.py` - Use settings for timeouts
3. `worker/processor.py` - Use settings for batch limits and defaults
4. `worker/main.py` - Use settings for all hardcoded timeouts and intervals
5. `worker/message/validators.py` - Use settings for video extensions
6. `worker/message/utils.py` - Use settings for MIME type mapping
7. `shared/settings_resolver.py` - Remove (deprecated)
8. `worker/settings_utilities.py` - Remove (duplicate)

### Settings Access Pattern:
```python
from shared.settings import settings

# Access worker settings
batch_limit = settings.get_worker_setting('default_batch_limit', 100)
retry_backoff = settings.get_worker_setting('thumbnail_retry_backoff_minutes', [5, 15, 60])

# Access channel settings  
mime_types = settings.get_channel_setting('mime_allowlist', ['video/mp4'])
video_extensions = settings.get_channel_setting('video_extensions', ['.mp4'])
```

## Benefits of This Approach

1. **Centralized Configuration** - All timeouts, limits, and settings in one place
2. **No Environment Variable Sprawl** - Settings file instead of many env vars
3. **Consistent Defaults** - Same fallback values across all code
4. **Easy Tuning** - Adjust performance settings without code changes
5. **Better Documentation** - Settings file serves as configuration documentation
6. **Type Safety** - Settings loader can provide proper typing and validation
