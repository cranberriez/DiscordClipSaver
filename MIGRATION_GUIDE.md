# Migration Guide: Reorganizing to Tortoise ORM

This guide explains how to migrate from the current structure to the new Tortoise ORM-based shared module architecture.

## New Project Structure

```
/python
  /shared              # NEW: Shared code for bot + future workers
    /db
      - models.py      # Tortoise ORM models
      - repositories.py # Repository layer (backward compatible)
      - config.py      # DB configuration
      - types.py       # Type definitions
      - __init__.py
    - pyproject.toml
    - requirements.txt
    - README.md
  /bot                 # Move current /bot here
  /worker              # Future worker (placeholder)
/interface             # Keep Next.js here (no changes)
/docs
```

## Migration Steps

### Step 1: Install Shared Module Dependencies

```bash
cd python/shared
pip install -e .
```

This installs the shared module in editable mode.

### Step 2: Move Bot Code

**Option A: Manual Move**

```bash
# From project root
mv bot python/bot
```

**Option B: Keep bot in place and update imports**
You can also keep the bot where it is and just update the import paths. The shared module is installed as a package, so it can be imported from anywhere.

### Step 3: Update Bot Imports

In your bot code, replace:

**Old imports:**

```python
from db import database as db
from db.types import GuildSnapshot, ChannelSnapshot
```

**New imports:**

```python
from shared.db import repositories as db
from shared.db.types import GuildSnapshot, ChannelSnapshot
```

The repository layer provides the **exact same function signatures**, so your existing code should work without modification!

### Step 4: Update Database Initialization

In `main.py` (or wherever you initialize the database):

**Old:**

```python
from db import database

database.configure_from_env()
await database.init_db()
```

**New:**

```python
from shared.db import init_db

await init_db()  # Reads from environment variables automatically
```

### Step 5: Update requirements.txt

Add to `python/bot/requirements.txt`:

```txt
# Existing dependencies...
discord.py==2.6.3
fastapi==0.118.0
# ...

# Add shared module (editable install)
-e ../shared
```

Or if you're not using editable install:

```txt
discord-clip-saver-shared @ file:///path/to/python/shared
```

### Step 6: Update Docker Configuration

**Update `bot/Dockerfile`:**

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Copy shared module first
COPY python/shared /app/shared

# Install shared module
RUN pip install -e ./shared

# Copy bot code
COPY python/bot /app/bot
WORKDIR /app/bot

# Install bot dependencies
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "main.py"]
```

**Update `docker-compose.yml`:**

```yaml
services:
    bot:
        build:
            context: .
            dockerfile: ./python/bot/Dockerfile # Updated path
        container_name: dcs-bot
        # ... rest of config
```

### Step 7: Initialize Database Schema

On first run with Tortoise ORM, the tables will be automatically created. However, if you want to use migrations:

```bash
cd python/shared
aerich init -t shared.db.config.TORTOISE_ORM
aerich init-db
```

This creates a `migrations` folder with the initial schema.

## Backward Compatibility

The repository layer (`shared.db.repositories`) provides **100% backward compatibility** with your existing database calls:

| Old Call                        | New Call                        | Status  |
| ------------------------------- | ------------------------------- | ------- |
| `db.upsert_guild(...)`          | `db.upsert_guild(...)`          | ✅ Same |
| `db.upsert_guilds(...)`         | `db.upsert_guilds(...)`         | ✅ Same |
| `db.get_channels_by_guild(...)` | `db.get_channels_by_guild(...)` | ✅ Same |
| `db.update_guild_settings(...)` | `db.update_guild_settings(...)` | ✅ Same |

All functions maintain the same signatures and behavior!

## Using Tortoise ORM Directly

You can also use Tortoise ORM models directly for more advanced queries:

```python
from shared.db import Guild, Channel

# Query with joins
guilds_with_channels = await Guild.all().prefetch_related('channels')

# Complex filtering
active_channels = await Channel.filter(
    is_reading=True,
    guild_id='123456789'
).order_by('-message_count')

# Aggregations
from tortoise.functions import Count
guild_channel_counts = await Guild.annotate(
    channel_count=Count('channels')
).values('guild_id', 'name', 'channel_count')
```

## Benefits of New Structure

1. **Shared Code**: Both bot and future worker can import `shared.db`
2. **Type Safety**: Tortoise ORM provides better type hints and validation
3. **Cleaner Queries**: No raw SQL strings
4. **Automatic Migrations**: Use Aerich to track and apply schema changes
5. **Better Testing**: Mock models instead of database connections
6. **Async Native**: Built for async/await from the ground up

## Testing the Migration

1. **Run the bot** and verify it connects to the database
2. **Check logs** for any import errors
3. **Test guild sync** to ensure upserts work
4. **Test channel operations** to ensure reads/writes work
5. **Verify settings** are properly loaded and saved

## Rollback Plan

If you need to rollback:

1. Keep the old `/bot` directory as a backup before moving
2. The database schema is compatible (same table names and columns)
3. Simply revert the import changes and use the old code

## Future: Adding a Worker

With this structure, adding a worker is simple:

```python
# In python/worker/main.py
from shared.db import init_db, Guild, Channel

await init_db()

# Worker can now access the same database models
guilds = await Guild.all()
```

No code duplication needed!

## Questions?

-   Check the `python/shared/README.md` for detailed usage
-   Review `shared/db/models.py` for model definitions
-   See `shared/db/repositories.py` for the backward-compatible API
