# Enhanced Logging System

## Overview

The project uses an enhanced logging system with colored output, custom formatting, and a new `VERBOSE` logging level to help reduce log verbosity during normal operations.

## Features

- **🎨 Colored Output**: Different colors for each log level using `colorlog`
  - `DEBUG` - Blue
  - `VERBOSE` - Cyan
  - `INFO` - Green
  - `WARNING` - Yellow
  - `ERROR` - Red
  - `CRITICAL` - Red on white background

- **📝 Clean Format**: `TIMESTAMP [LEVEL] function_name: message`
  - Example: `2025-10-17 07:44:46 [INFO    ] initialize: Worker initialized successfully`

- **🔍 VERBOSE Level**: New logging level between INFO and DEBUG
  - Level value: 15 (INFO=20, DEBUG=10)
  - Used for detailed but not debugging information
  - Helps reduce noise from configuration dumps and internal operations

## Configuration

### Environment Variable

Set the `LOG_LEVEL` environment variable to control logging verbosity:

```bash
LOG_LEVEL=INFO    # Default - normal operations
LOG_LEVEL=VERBOSE # More detailed, includes config information
LOG_LEVEL=DEBUG   # Full debugging output
LOG_LEVEL=WARNING # Only warnings and errors
```

### In Docker Compose

```yaml
environment:
  LOG_LEVEL: "INFO"  # or VERBOSE, DEBUG, etc.
```

## Usage in Code

### Standard Logging

```python
from shared.logger import get_logger

logger = get_logger(__name__)

logger.debug("Detailed debugging information")
logger.info("Normal operational messages")
logger.warning("Warning messages")
logger.error("Error messages")
logger.critical("Critical issues")
```

### VERBOSE Level

```python
from shared.logger import get_logger, VERBOSE

logger = get_logger(__name__)

# Log at VERBOSE level
logger.log(VERBOSE, "Database config: %s", config)
```

Or use the convenience method:

```python
logger.verbose("This is a verbose message")
```

## Module Setup

### Entry Points (Centralized Setup)

Both **bot** and **worker** have centralized logger modules:

**Bot (`python/bot/logger.py`)**:
```python
from shared.logger import setup_logging, get_logger

log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(level=log_level, use_colors=True)

logger = get_logger("discord_clip_saver")
```

**Worker (`python/worker/logger.py`)**:
```python
from shared.logger import setup_logging, get_logger

log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(level=log_level, use_colors=True)

logger = get_logger(__name__)
```

These are imported by the main entry points:
- `python/bot/main.py` imports `bot.logger`
- `python/worker/main.py` imports `worker.logger`

### For Individual Modules

**Option 1: Standard logging (Recommended)**
```python
import logging

logger = logging.getLogger(__name__)
```

This works because the centralized logger setup configures the root logger. All calls to `logging.getLogger()` inherit that configuration automatically.

**Option 2: Shared logger wrapper**
```python
from shared.logger import get_logger

logger = get_logger(__name__)
```

This is functionally identical to Option 1 (it's just a wrapper around `logging.getLogger()`), but provides consistency if you prefer explicit imports.

### Key Points

1. **Setup happens once** in `bot/logger.py` or `worker/logger.py`
2. **All other modules** can use standard `logging.getLogger(__name__)`
3. **No need to call `setup_logging()`** in individual modules
4. **Configuration is inherited** from the root logger automatically

## Third-Party Library Levels

The logging system automatically sets appropriate levels for noisy third-party libraries:

- **Discord.py**
  - `discord` - INFO
  - `discord.gateway` - WARNING (reduced noise)
  - `discord.client` - WARNING (reduced noise)

- **Uvicorn** (FastAPI)
  - `uvicorn` - INFO
  - `uvicorn.access` - WARNING (reduced access log noise)

## Use Cases

### Normal Operations (INFO)
- Worker startup/shutdown
- Job processing completion
- Database connections
- Redis connections

### Detailed Inspection (VERBOSE)
- Database configuration details
- Connection pool settings
- Retry logic details
- Internal state information

### Debugging (DEBUG)
- Detailed function execution
- Variable states
- Low-level operations
- Full stack traces

## Implementation Details

The logging system is implemented in `python/shared/logger.py` and provides:

1. **Custom VERBOSE level** (15) between INFO and DEBUG
2. **Colored formatter** using `colorlog` library
3. **Consistent format** across all modules
4. **Environment-based configuration** via `LOG_LEVEL`
5. **Third-party library noise reduction**

## Migration Notes

### Changes from Old System

**Before:**
```
2025-10-17 07:44:46,591 - __main__ - INFO - Worker initialized successfully
2025-10-17 07:44:46,591 - shared.db.utils - INFO - Initializing database, tortoise config: {...}
```

**After:**
```
2025-10-17 07:44:46 [INFO    ] initialize: Worker initialized successfully
2025-10-17 07:44:46 [VERBOSE ] init_db: Initializing database, tortoise config: {...}
```

### Key Improvements

1. ✅ Colored log levels for better visibility
2. ✅ Function name instead of module path
3. ✅ VERBOSE level reduces noise at INFO
4. ✅ Cleaner timestamp format
5. ✅ Consistent formatting across all modules
6. ✅ Environment-based configuration
