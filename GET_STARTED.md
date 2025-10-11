# Get Started with Tortoise ORM Migration

## What I Built For You

I've created a complete Tortoise ORM-based shared module architecture for your Discord Clip Saver project. This allows you to:

1. ✅ **Share database code** between your bot and future worker
2. ✅ **Use modern ORM** instead of raw SQL strings
3. ✅ **Keep backward compatibility** - minimal code changes needed
4. ✅ **Better type safety** with full IDE autocomplete
5. ✅ **Automatic migrations** with Aerich

## 📁 New Project Structure

```
DiscordClipSaver/
├── python/                          # ✨ NEW: All Python services
│   ├── shared/                      # ✨ NEW: Shared module
│   │   ├── db/
│   │   │   ├── models.py           # Tortoise ORM models
│   │   │   ├── repositories.py     # Backward-compatible API
│   │   │   ├── config.py           # Database configuration
│   │   │   └── types.py            # Type definitions
│   │   ├── pyproject.toml
│   │   └── requirements.txt
│   ├── bot/                         # Your bot (examples provided)
│   │   ├── main_example.py
│   │   └── services/
│   │       └── guild_service_example.py
│   ├── worker/                      # ✨ NEW: Future worker
│   │   ├── example_worker.py
│   │   └── requirements.txt
│   ├── setup_dev.py                 # Easy setup script
│   └── README.md
├── interface/                       # Your Next.js app (unchanged)
├── docs/                           # Your docs (unchanged)
├── MIGRATION_GUIDE.md              # ✨ Step-by-step migration
├── QUICK_REFERENCE.md              # ✨ Quick lookup
├── IMPLEMENTATION_SUMMARY.md       # ✨ What was built
└── GET_STARTED.md                  # ✨ This file
```

## ⚡ Quick Start (3 Steps)

### Step 1: Install the Shared Module

```bash
cd python
python setup_dev.py
```

This automated script will:

-   Install the shared module in editable mode
-   Verify all imports work
-   Check your database configuration
-   Optionally test database connection

**OR** manually:

```bash
cd python/shared
pip install -e .
```

### Step 2: Try the Example Worker

```bash
cd python/worker
pip install -r requirements.txt
python example_worker.py
```

This demonstrates how to use the shared database module from a separate service.

### Step 3: Review the Documentation

-   **QUICK_REFERENCE.md** - Common operations and import changes
-   **MIGRATION_GUIDE.md** - Detailed migration steps
-   **python/shared/README.md** - API documentation

## 🔄 How to Migrate Your Existing Bot

### Option A: Minimal Changes (Recommended)

You can start using the shared module **without moving any files**:

1. **Install shared module:**

    ```bash
    cd python/shared
    pip install -e .
    ```

2. **Update imports in your bot code:**

    ```python
    # OLD:
    from db import database as db
    from db.types import GuildSnapshot, ChannelSnapshot

    # NEW:
    from shared.db import repositories as db
    from shared.db.types import GuildSnapshot, ChannelSnapshot
    ```

3. **Update database initialization in main.py:**

    ```python
    # OLD:
    from db import database
    database.configure_from_env()
    await database.init_db()

    # NEW:
    from shared.db import init_db, close_db
    await init_db()
    # ... at shutdown:
    await close_db()
    ```

**That's it!** All your existing function calls work unchanged:

-   `await db.upsert_guild(...)` ✅ Works
-   `await db.get_channels_by_guild(...)` ✅ Works
-   `await db.update_guild_settings(...)` ✅ Works

### Option B: Full Restructure

Move your bot to the new structure:

```bash
# From project root
mv bot python/bot
```

Then update paths in:

-   `docker-compose.yml`
-   `Dockerfile`

See `MIGRATION_GUIDE.md` for detailed Docker configuration updates.

## 📊 Before & After Comparison

### Before (Raw SQL with psycopg3)

```python
from db import database as db

# Database initialization
database.configure_from_env()
await database.init_db()

# Query channels (raw SQL in repositories)
channels = await db.get_channels_by_guild("123456")
```

### After (Tortoise ORM)

```python
from shared.db import repositories as db
from shared.db import Channel  # Can also use ORM directly

# Database initialization (simpler)
await init_db()

# Same repository function - works unchanged!
channels = await db.get_channels_by_guild("123456")

# OR use ORM directly for complex queries
channels = await Channel.filter(
    guild_id="123456",
    is_reading=True,
    message_count__gte=100
).order_by('-message_count')
```

## 🎯 Key Files to Read

| Priority            | File                              | What It Contains                   |
| ------------------- | --------------------------------- | ---------------------------------- |
| 🔥 **START HERE**   | `QUICK_REFERENCE.md`              | Import changes, common operations  |
| 📖 **DETAILED**     | `MIGRATION_GUIDE.md`              | Step-by-step migration with Docker |
| 🔧 **API DOCS**     | `python/shared/README.md`         | Shared module documentation        |
| 📝 **EXAMPLES**     | `python/bot/*_example.py`         | Example adapted code               |
| 🏗️ **ARCHITECTURE** | `IMPLEMENTATION_SUMMARY.md`       | What was built and why             |
| ⚙️ **WORKER**       | `python/worker/example_worker.py` | Background worker example          |

## 💡 Benefits of This Approach

### 1. Code Reuse

```python
# Both bot AND worker can import the same code:
from shared.db import Guild, Channel, repositories
```

### 2. Type Safety

```python
# Full autocomplete and type checking
async def get_active_channels() -> list[Channel]:
    channels = await Channel.filter(is_reading=True).all()

    for channel in channels:
        # IDE knows all these types!
        print(channel.name)          # str
        print(channel.message_count)  # int
        print(channel.is_reading)     # bool

    return channels
```

### 3. Cleaner Queries

```python
# Instead of raw SQL:
await cur.execute("""
    SELECT * FROM bot_channels
    WHERE guild_id = %s AND is_reading = true
    ORDER BY message_count DESC
""", (guild_id,))

# Pythonic ORM:
channels = await Channel.filter(
    guild_id=guild_id,
    is_reading=True
).order_by('-message_count')
```

### 4. Easy Testing

```python
# Mock models instead of database connections
from unittest.mock import AsyncMock
from shared.db import Guild

# In tests:
Guild.get = AsyncMock(return_value=fake_guild)
```

## 🔍 Understanding the Repository Layer

The repository layer (`shared.db.repositories`) provides **100% backward compatibility**:

```python
from shared.db import repositories

# All these work EXACTLY as before:
await repositories.upsert_guild(...)
await repositories.upsert_guilds(...)
await repositories.delete_guilds(...)
await repositories.get_channels_by_guild(...)
await repositories.update_guild_settings(...)
await repositories.enqueue_scan_run(...)
# ... all your existing functions work!
```

**Under the hood**, they now use Tortoise ORM instead of raw SQL, but the interface is identical.

## 🚦 Migration Checklist

-   [ ] Read `QUICK_REFERENCE.md`
-   [ ] Install shared module: `cd python/shared && pip install -e .`
-   [ ] Test import: `python -c "from shared.db import Guild; print('✅ Works!')"`
-   [ ] Try example worker: `cd python/worker && python example_worker.py`
-   [ ] Review `main_example.py` to see required changes
-   [ ] Review `guild_service_example.py` to see service changes
-   [ ] Update imports in one service file as a test
-   [ ] Test your bot still works
-   [ ] Gradually migrate remaining files
-   [ ] Update Docker configuration (if moving /bot)
-   [ ] Set up Aerich for migrations: `cd python/shared && aerich init-db`

## 🆘 Common Questions

### Q: Do I have to move my /bot directory?

**A:** No! You can keep it where it is. Just install the shared module and update imports.

### Q: Will this break my existing database?

**A:** No! The models use the same table names and schemas as your current setup.

### Q: Do I need to change all my code at once?

**A:** No! Migrate incrementally. The repository layer maintains backward compatibility.

### Q: What if I want to use raw SQL for complex queries?

**A:** You can! Tortoise supports raw SQL:

```python
from tortoise import Tortoise
await Tortoise.get_connection("default").execute_query("SELECT ...")
```

### Q: How do I add a new field to a model?

**A:** Edit `shared/db/models.py`, then create a migration:

```bash
cd python/shared
aerich migrate --name "added_new_field"
aerich upgrade
```

## 🎓 Learning Path

### Day 1: Understand the Structure

-   Read `QUICK_REFERENCE.md`
-   Review the directory structure
-   Understand the repository layer concept

### Day 2: Test Drive

-   Install shared module
-   Run `setup_dev.py`
-   Try `example_worker.py`
-   Review example files

### Day 3: First Migration

-   Pick one simple service file (e.g., `guild_service.py`)
-   Update imports
-   Test it works
-   Compare with `guild_service_example.py`

### Day 4+: Full Migration

-   Migrate remaining files
-   Update Docker configuration
-   Set up Aerich migrations
-   Deploy!

## 📞 Resources

### Documentation

-   [Tortoise ORM Docs](https://tortoise.github.io/)
-   [Aerich (Migrations)](https://github.com/tortoise/aerich)
-   [AsyncPG](https://magicstack.github.io/asyncpg/)

### Project Files

-   `QUICK_REFERENCE.md` - Quick lookup
-   `MIGRATION_GUIDE.md` - Detailed steps
-   `python/shared/README.md` - API docs
-   `IMPLEMENTATION_SUMMARY.md` - Architecture overview

## ✅ What's Next?

1. **Run the setup script:**

    ```bash
    cd python
    python setup_dev.py
    ```

2. **Read the quick reference:**

    ```bash
    # Open in your editor:
    QUICK_REFERENCE.md
    ```

3. **Try the example worker:**

    ```bash
    cd python/worker
    python example_worker.py
    ```

4. **Start migrating:**
    - Update one file's imports
    - Test it works
    - Repeat!

---

**Questions?** Check the documentation files or review the example implementations!

**Ready to migrate?** Start with `QUICK_REFERENCE.md` 🚀
