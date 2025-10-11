# Discord Clip Saver - Shared Module

This is the shared Python module for Discord Clip Saver, containing database models and utilities that can be imported by both the bot and worker services.

## Structure

```
shared/
├── db/
│   ├── __init__.py
│   ├── config.py          # Database configuration and initialization
│   ├── models.py          # Tortoise ORM models
│   ├── repositories.py    # Repository layer (backward compatible API)
│   └── types.py           # Type definitions
├── pyproject.toml
├── requirements.txt
└── README.md
```

## Installation

### Development Mode (Editable Install)

From the `/python` directory:

```bash
pip install -e ./shared
```

This allows you to import `shared` from both `bot` and `worker` packages.

### Production

```bash
pip install ./shared
```

## Usage

### Initializing the Database

```python
from shared.db import init_db, close_db

# At application startup
await init_db()

# At application shutdown
await close_db()
```

### Using Models Directly (Tortoise ORM)

```python
from shared.db import Guild, Channel

# Create a guild
guild = await Guild.create(
    guild_id="123456789",
    name="My Guild",
    icon="icon_hash.png"
)

# Query channels
channels = await Channel.filter(guild_id="123456789").all()
```

### Using Repository Layer (Backward Compatible)

The repository layer provides the same function interface as the old psycopg3 implementation:

```python
from shared.db import repositories

# Upsert a guild
await repositories.upsert_guild(
    guild_id="123456789",
    name="My Guild",
    icon="icon_hash.png"
)

# Get channels by guild
channels = await repositories.get_channels_by_guild("123456789")
```

## Database Migrations

This module uses [Aerich](https://github.com/tortoise/aerich) for database migrations.

### Initialize Aerich (First Time)

```bash
cd /python/shared
aerich init -t shared.db.config.TORTOISE_ORM
aerich init-db
```

### Create a New Migration

```bash
aerich migrate --name "describe_your_changes"
```

### Apply Migrations

```bash
aerich upgrade
```

### Rollback Migrations

```bash
aerich downgrade
```

## Environment Variables

The database configuration reads from the following environment variables:

- `POSTGRES_HOST` or `DB_HOST` (default: `localhost`)
- `POSTGRES_PORT` or `DB_PORT` (default: `5432`)
- `POSTGRES_USER` or `DB_USER` (default: `postgres`)
- `POSTGRES_PASSWORD` or `DB_PASSWORD` (default: `postgres`)
- `POSTGRES_DB` or `DB_NAME` (default: `postgres`)
- `POSTGRES_DSN` or `DATABASE_URL` (optional, overrides individual settings)

## Models

### User
Discord user information.

### Guild
Discord server/guild information with foreign key to owner user.

### GuildSettings
Per-guild configuration stored as JSONB.

### Channel
Discord channel information with foreign key to guild.

### ChannelScanRun
Tracks channel scanning operations with status and progress.

### InstallIntent
OAuth installation flow state management.

## Type Definitions

The `types.py` module provides dataclass definitions for backward compatibility:

- `ChannelSnapshot`
- `GuildSnapshot`
- `GuildSettings`

These can be used with the repository functions to maintain the same interface as before.
