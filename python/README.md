# Discord Clip Saver - Python Services

This directory contains all Python-based services for Discord Clip Saver.

## Structure

```
python/
|-- shared/              # Shared module: database, Redis, storage, settings
|   |-- db/              # Tortoise ORM models and repositories
|   |-- pyproject.toml
|   `-- requirements.txt
|-- bot/                 # FastAPI and Discord gateway runtimes
|   |-- main.py          # BOT_RUNTIME_MODE=all|api|discord
|   |-- requirements.txt
|   `-- ...
`-- worker/              # Redis stream worker
    |-- main.py          # WORKER_MODE=all|discord|maintenance
    `-- requirements.txt
```

## Quick Start

### 1. Install Shared Module

```bash
cd python/shared
pip install -e .
```

This makes the `shared` package importable from both `bot` and `worker`.

### 2. Run the Bot API

```bash
cd python
pip install -r bot/requirements.txt
BOT_RUNTIME_MODE=api python -m bot.main
```

### 3. Run the Discord Gateway Listener

```bash
cd python
pip install -r bot/requirements.txt
BOT_RUNTIME_MODE=discord python -m bot.main
```

### 4. Run a Worker

```bash
cd python
pip install -r worker/requirements.txt
WORKER_MODE=maintenance python -m worker.main
```

## Key Benefits of This Structure

### ✅ Code Reuse

Both bot and worker can import from `shared.db`:

```python
from shared.db import Guild, Channel, repositories
```

### ✅ Single Source of Truth

Database models are defined once in `shared/db/models.py` and used everywhere.

### ✅ Backward Compatible

The `repositories` module provides the same API as the old psycopg3 implementation:

```python
from shared.db import repositories as db

# Works exactly like before!
await db.upsert_guild(guild_id="123", name="Test")
```

### ✅ Modern ORM

Use Tortoise ORM for complex queries:

```python
from shared.db import Guild

guilds = await Guild.filter(name__icontains="discord").all()
```

### ✅ Type Safety

Tortoise models provide excellent type hints and validation.

## Environment Variables

All services read from the same environment variables:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=discord_clip_saver

# Or use a connection string
DATABASE_URL=postgres://user:pass@host:port/db
```

## Development Workflow

### Making Database Changes

1. **Edit models** in `shared/db/models.py`
2. **Create missing tables in local/dev databases**:
    ```bash
    python -m shared.db.schema
    ```

The Docker stack runs the same initializer as the `db-schema` one-shot service.
It uses Tortoise `generate_schemas(safe=True)` and only creates missing tables;
destructive schema changes still need a planned migration path.

Aerich migration commands are not currently wired into the default Docker
startup path. If you configure Aerich separately, the intended flow is:

1. **Create migration**:
    ```bash
    cd python/shared
    aerich migrate --name "your_change"
    ```
2. **Apply migration**:
    ```bash
    aerich upgrade
    ```

### Adding New Repositories

Add new functions to `shared/db/repositories.py`. They'll automatically be available to both bot and worker.

### Testing

Each package can have its own tests:

```bash
# Test shared module
cd python/shared
pytest tests/

# Test bot
cd python/bot
pytest tests/

# Test worker
cd python/worker
pytest tests/
```

## Architecture Diagram

The Python services share code but run as separate modes/processes:

```text
interface ---> bot-api (FastAPI) ---> Discord REST
     |             |
     |             `-- PostgreSQL
     `-- PostgreSQL

bot-discord (discord.py) ---> PostgreSQL
          `---------------> Redis Streams ---> worker

worker modes:
- all: Discord jobs and maintenance jobs
- discord: scan/message/rescan/guild purge jobs
- maintenance: DB/storage jobs without Discord bot startup
```

Legacy high-level module diagram:

```
┌─────────────────────────────────────────┐
│           Next.js Interface             │
│          (interface/ directory)         │
└─────────────────┬───────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────┐
│        Bot API / Discord Gateway        │
│          (python/bot/ directory)        │
└─────────────────┬───────────────────────┘
                  │
                  │ imports
                  │
┌─────────────────▼───────────────────────┐
│          Background Worker              │
│        (python/worker/ directory)       │
└─────────────────┬───────────────────────┘
                  │
                  │ both import
                  │
┌─────────────────▼───────────────────────┐
│           Shared Module                 │
│      (python/shared/ directory)         │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │    Tortoise ORM Models           │  │
│  │    - Guild, Channel, User, etc.  │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │    Repository Layer              │  │
│  │    - Backward compatible API     │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │    Database Configuration        │  │
│  │    - Connection management       │  │
│  └──────────────────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │
                  │ connects to
                  │
┌─────────────────▼───────────────────────┐
│          PostgreSQL Database            │
└─────────────────────────────────────────┘
```

## Migration from Old Structure

See the [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) in the root directory for detailed steps on migrating from the old structure to this new one.

Key changes:

- `from db import database` → `from shared.db import repositories`
- `from db.types import X` → `from shared.db.types import X`
- `database.init_db()` → `init_db()`

## Contributing

1. Make changes to the shared module first
2. Update bot/worker code to use new shared APIs
3. Write tests for new functionality
4. Update documentation

## Resources

- [Tortoise ORM Documentation](https://tortoise.github.io/)
- [Aerich (Migrations)](https://github.com/tortoise/aerich)
- [Project Root README](../README.md)
