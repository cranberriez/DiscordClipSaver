# Quick Reference: Tortoise ORM Migration

## Import Changes

### Old Imports (psycopg3)
```python
from db import database as db
from db.types import GuildSnapshot, ChannelSnapshot
```

### New Imports (Tortoise ORM)
```python
# Option 1: Use repository layer (backward compatible)
from shared.db import repositories as db
from shared.db.types import GuildSnapshot, ChannelSnapshot

# Option 2: Use models directly (recommended for new code)
from shared.db import Guild, Channel, init_db, close_db
```

## Database Initialization

### Old
```python
from db import database

database.configure_from_env()
await database.init_db()
```

### New
```python
from shared.db import init_db, close_db

await init_db()  # Auto-reads from environment

# At shutdown:
await close_db()
```

## Common Operations

### Guild Operations

```python
from shared.db import repositories as db

# Upsert a guild (same as before!)
await db.upsert_guild(
    guild_id="123456",
    name="My Server",
    icon="icon.png"
)

# Batch upsert
await db.upsert_guilds([guild1, guild2, guild3])

# Delete guilds
await db.delete_guilds(["123", "456"])

# Touch (update last_seen_at)
await db.touch_guild("123456")
```

### Guild Settings

```python
from shared.db import repositories as db

# Get settings
settings = await db.get_guild_settings("123456")

# Ensure settings exist
settings = await db.ensure_guild_settings("123456", defaults={})

# Update settings (merge)
await db.update_guild_settings("123456", {"key": "value"})

# Replace settings
await db.set_guild_settings("123456", {"new": "settings"})
```

### Channel Operations

```python
from shared.db import repositories as db

# Upsert channels for a guild
await db.upsert_channels_for_guild("guild_id", [channel1, channel2])

# Get channels by guild
channels = await db.get_channels_by_guild("guild_id")

# Set reading state
await db.set_channel_reading("channel_id", True)

# Update cursor
await db.update_channel_cursor("channel_id", "message_id")

# Update progress
await db.update_channel_progress("channel_id", "last_msg_id", 100)

# Touch activity
await db.touch_channel_activity("channel_id")

# Increment message count
await db.increment_channel_message_count("channel_id", 5)

# Delete channels
await db.delete_channels(["ch1", "ch2"])
```

### Scan Runs

```python
from shared.db import repositories as db

# Enqueue a scan
run_id = await db.enqueue_scan_run("channel_id")

# Mark started
success = await db.mark_scan_started(run_id)

# Update progress
await db.update_scan_progress(run_id, scanned_inc=10, matched_inc=2)

# Mark finished
await db.mark_scan_succeeded(run_id)
await db.mark_scan_failed(run_id, "Error message")
await db.mark_scan_canceled(run_id)
```

## Using Tortoise ORM Directly

For more complex queries, use Tortoise ORM models:

### Basic Queries

```python
from shared.db import Guild, Channel

# Get all guilds
guilds = await Guild.all()

# Get one guild
guild = await Guild.get(guild_id="123456")

# Get or None (no exception)
guild = await Guild.get_or_none(guild_id="123456")

# Filter
active_channels = await Channel.filter(is_reading=True)

# Filter with multiple conditions
channels = await Channel.filter(
    guild_id="123456",
    is_reading=True,
    message_count__gte=100  # >= 100
)

# Exclude
channels = await Channel.exclude(is_nsfw=True)

# Order by
channels = await Channel.all().order_by('-message_count')  # DESC
```

### Joins / Prefetch

```python
from shared.db import Guild

# Prefetch related (1 query with JOIN)
guilds = await Guild.all().prefetch_related('channels')
for guild in guilds:
    print(f"{guild.name}: {len(guild.channels)} channels")

# Fetch related (N+1 queries, but lazy)
guild = await Guild.get(guild_id="123")
await guild.fetch_related('channels')
```

### Aggregations

```python
from tortoise.functions import Count, Sum
from shared.db import Guild, Channel

# Count channels per guild
results = await Guild.annotate(
    channel_count=Count('channels')
).values('guild_id', 'name', 'channel_count')

# Sum message counts
total = await Channel.filter(guild_id="123").aggregate(
    total_messages=Sum('message_count')
)
```

### Create / Update / Delete

```python
from shared.db import Guild

# Create
guild = await Guild.create(
    guild_id="123",
    name="Test Server"
)

# Update
guild.name = "New Name"
await guild.save()

# Update specific fields only
await guild.save(update_fields=['name'])

# Bulk update
await Guild.filter(guild_id__in=["1", "2"]).update(
    last_seen_at=datetime.now()
)

# Delete
await guild.delete()

# Bulk delete
await Guild.filter(guild_id__in=["1", "2"]).delete()
```

### Transactions

```python
from tortoise.transactions import in_transaction

async with in_transaction():
    guild = await Guild.create(guild_id="123", name="Test")
    channel = await Channel.create(
        channel_id="456",
        guild_id=guild.guild_id,
        name="general"
    )
    # Both committed together, or both rolled back on error
```

## Environment Variables

Required environment variables (same as before):

```bash
# Individual settings
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=discord_clip_saver

# OR use connection string (takes precedence)
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
```

## Migrations with Aerich

```bash
# Initialize (first time only)
cd python/shared
aerich init -t shared.db.config.TORTOISE_ORM
aerich init-db

# Create migration after model changes
aerich migrate --name "describe_changes"

# Apply migrations
aerich upgrade

# Rollback
aerich downgrade

# View migration history
aerich history
```

## Type Hints

Tortoise ORM provides excellent type hints:

```python
from shared.db import Guild, Channel
from typing import List

async def get_guild_channels(guild_id: str) -> List[Channel]:
    """IDE will auto-complete Channel fields!"""
    channels = await Channel.filter(guild_id=guild_id).all()
    
    for channel in channels:
        # Type-safe access:
        print(channel.name)  # ✅ IDE knows this is str
        print(channel.message_count)  # ✅ IDE knows this is int
        print(channel.is_reading)  # ✅ IDE knows this is bool
    
    return channels
```

## Backward Compatibility

✅ All repository functions maintain the same signature as before  
✅ All type definitions (GuildSnapshot, etc.) remain the same  
✅ No changes needed to existing business logic  
✅ Only import statements need to be updated  

## Benefits Summary

| Feature | Old (psycopg3) | New (Tortoise ORM) |
|---------|---------------|-------------------|
| **Type Safety** | ❌ No type hints | ✅ Full type hints |
| **Query Builder** | ❌ Raw SQL strings | ✅ Pythonic query API |
| **Migrations** | ❌ Manual SQL | ✅ Automatic with Aerich |
| **Code Sharing** | ❌ Hard to share | ✅ Shared module |
| **Async Support** | ✅ Yes | ✅ Native async |
| **Complex Queries** | ⚠️ Manual SQL | ✅ ORM helpers |
| **Testing** | ⚠️ Mock DB | ✅ Mock models |

## Getting Help

- Check `python/shared/README.md` for detailed documentation
- See `MIGRATION_GUIDE.md` for step-by-step migration
- Review example files in `python/bot/*_example.py`
- Check [Tortoise ORM docs](https://tortoise.github.io/)
