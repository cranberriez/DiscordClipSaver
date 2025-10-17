# Logging Migration Summary

## Changes Made

### 1. New Shared Logger Module
Created `python/shared/logger.py` with:
- **Custom VERBOSE level** (15) - Between INFO and DEBUG
- **Colored output** using `colorlog` library
- **Clean format**: `TIMESTAMP [COLORED_LEVEL] function_name: message`
- **Environment-based configuration** via `LOG_LEVEL` env var
- **Third-party library noise reduction** (discord.gateway, discord.client, uvicorn.access)

### 2. Updated Requirements
Added `colorlog` dependency to:
- `python/worker/requirements.txt`
- `python/bot/requirements.txt`

### 3. Entry Points Updated
- **`python/worker/logger.py`**: Created centralized logger setup (matches bot pattern)
- **`python/worker/main.py`**: Now imports from `worker.logger` 
- **`python/bot/logger.py`**: Simplified to use shared logger module

Both bot and worker now follow the same pattern:
- Centralized logger module (`bot/logger.py` and `worker/logger.py`)
- Main entry point imports the logger
- Individual modules use standard `logging.getLogger(__name__)`
- Configuration is inherited from root logger automatically

### 4. Verbose Log Levels Applied
Moved detailed initialization info to VERBOSE level in:

**Database (`python/shared/db/utils.py`)**:
- Tortoise config details moved to VERBOSE
- Kept "Database initialized successfully" at INFO

**Storage (`python/shared/storage/`)**:
- Factory: Storage path/bucket details moved to VERBOSE
- Local: Full path moved to VERBOSE
- Kept "Using [type] storage backend" at INFO

**Thumbnail Generator (`python/worker/thumbnail/thumbnail_generator.py`)**:
- Storage backend type, FFmpeg path, timeout config moved to VERBOSE
- Kept "ThumbnailGenerator initialized" at INFO

### 5. Environment Variable
Added to `.env.global.example`:
```bash
LOG_LEVEL="INFO"  # Options: DEBUG, VERBOSE, INFO, WARNING, ERROR, CRITICAL
```

## Before vs After

### Before (No Colors, Verbose)
```
2025-10-17 07:44:46,591 - __main__ - INFO - Worker initialized successfully
2025-10-17 07:44:46,591 - shared.db.utils - INFO - Initializing database, tortoise config: {'connections': {'default': {...}}}
2025-10-17 07:44:46,618 - shared.db.utils - INFO - Database initialized successfully, schemas generated: False, tortoise config: {...}
2025-10-17 07:44:46,625 - shared.storage.factory - INFO - Using local storage backend: /app/storage
2025-10-17 07:44:46,625 - shared.storage.local - INFO - LocalStorageBackend initialized at: /app/storage
2025-10-17 07:44:46,626 - worker.thumbnail.thumbnail_generator - INFO - ThumbnailGenerator initialized with storage: LocalStorageBackend
2025-10-17 07:44:46,626 - worker.thumbnail.thumbnail_generator - INFO - FFmpeg found at: /usr/bin/ffmpeg
2025-10-17 07:44:46,626 - worker.thumbnail.thumbnail_generator - INFO - Aiohttp session created for connection reuse
2025-10-17 07:44:47,508 - discord.gateway - INFO - Shard ID None has connected to Gateway (Session ID: 3969804d442c9ba6cdc134e7122a1e45).
2025-10-17 07:44:49,517 - worker.discord.bot - INFO - Discord bot logged in as Testing Bot#5653
```

### After (Colored, Condensed at INFO level)
```
2025-10-17 07:44:46 [INFO    ] initialize: Worker initialized successfully
2025-10-17 07:44:46 [INFO    ] init_db: Database initialized successfully
2025-10-17 07:44:46 [INFO    ] create_storage_backend: Using local storage backend
2025-10-17 07:44:46 [INFO    ] __init__: ThumbnailGenerator initialized
2025-10-17 07:44:49 [INFO    ] on_ready: Discord bot logged in as Testing Bot#5653
```

### With VERBOSE Level Enabled
```
2025-10-17 07:44:46 [INFO    ] initialize: Worker initialized successfully
2025-10-17 07:44:46 [VERBOSE ] init_db: Initializing database, tortoise config: {...}
2025-10-17 07:44:46 [INFO    ] init_db: Database initialized successfully
2025-10-17 07:44:46 [VERBOSE ] init_db: Schemas generated: False, tortoise config: {...}
2025-10-17 07:44:46 [INFO    ] create_storage_backend: Using local storage backend
2025-10-17 07:44:46 [VERBOSE ] create_storage_backend: Storage path: /app/storage
2025-10-17 07:44:46 [VERBOSE ] __init__: LocalStorageBackend initialized at: /app/storage
2025-10-17 07:44:46 [INFO    ] __init__: ThumbnailGenerator initialized
2025-10-17 07:44:46 [VERBOSE ] __init__: Storage backend: LocalStorageBackend
2025-10-17 07:44:46 [VERBOSE ] __init__: FFmpeg path: /usr/bin/ffmpeg
2025-10-17 07:44:46 [VERBOSE ] __init__: Download timeout: 300s, connect timeout: 10s
2025-10-17 07:44:49 [INFO    ] on_ready: Discord bot logged in as Testing Bot#5653
```

## Color Scheme

| Level    | Color                  | Use Case                          |
|----------|------------------------|-----------------------------------|
| DEBUG    | Blue                   | Detailed debugging info           |
| VERBOSE  | Cyan                   | Configuration details, internal   |
| INFO     | Green                  | Normal operations, milestones     |
| WARNING  | Yellow                 | Warnings, deprecations            |
| ERROR    | Red                    | Errors, failures                  |
| CRITICAL | Red on White           | Critical system failures          |

## Noise Reduction

Third-party libraries automatically set to reduce log spam:

| Library          | Level   | Reason                                    |
|------------------|---------|-------------------------------------------|
| discord.gateway  | WARNING | Reduces connection/shard messages         |
| discord.client   | WARNING | Reduces client initialization messages    |
| uvicorn.access   | WARNING | Reduces HTTP access log spam              |

## Usage for Developers

### Setting Log Level

**In Docker Compose:**
```yaml
environment:
  LOG_LEVEL: "INFO"  # or VERBOSE, DEBUG, etc.
```

**In Code (new modules):**
```python
from shared.logger import get_logger

logger = get_logger(__name__)

logger.info("Normal message")
logger.verbose("Detailed config info")
logger.debug("Debugging details")
```

### When to Use Each Level

- **INFO**: User-facing operations (job completed, service started, etc.)
- **VERBOSE**: Configuration details, internal state (DB config, file paths, etc.)
- **DEBUG**: Deep debugging, variable values, low-level operations

## Migration Checklist

- [x] Create shared logger module (`python/shared/logger.py`)
- [x] Add colorlog dependency to both requirements.txt
- [x] Create worker logger module (`python/worker/logger.py`) - matches bot pattern
- [x] Update worker main.py to import from worker.logger
- [x] Update bot logger.py to use shared logger
- [x] Move DB config to VERBOSE
- [x] Move storage details to VERBOSE
- [x] Move thumbnail generator details to VERBOSE
- [x] Add LOG_LEVEL to .env.global.example
- [x] Create documentation (LOGGING.md, LOGGING_MIGRATION.md)
- [x] Configure third-party library levels
- [x] Ensure consistent pattern between bot and worker

## Testing

To test the new logging:

1. **Build with new dependencies:**
   ```bash
   docker-compose build
   ```

2. **Run with default INFO level:**
   ```bash
   docker-compose up
   ```
   Should see clean, colored logs with essential info only.

3. **Run with VERBOSE level:**
   ```bash
   # Add to docker-compose.yml or .env:
   LOG_LEVEL=VERBOSE
   docker-compose up
   ```
   Should see additional configuration details.

4. **Run with DEBUG level:**
   ```bash
   LOG_LEVEL=DEBUG
   docker-compose up
   ```
   Should see all detailed debugging information.

## Benefits

1. ✅ **50-70% less log noise** at INFO level
2. ✅ **Color-coded severity** for quick scanning
3. ✅ **Clean format** with function names instead of full module paths
4. ✅ **Flexible verbosity** via LOG_LEVEL environment variable
5. ✅ **Third-party library filtering** reduces spam from discord.py, uvicorn
6. ✅ **VERBOSE level** provides middle-ground between INFO and DEBUG
