# Database Layer Documentation

## Overview

The database layer provides async operations for persisting Discord data. It uses a facade pattern with pluggable handlers.

## Architecture

### Database Facade (`db/database.py`)

The facade provides a unified async API that delegates to a configured handler.

**Configuration:**
```python
from db import database

# Configure from environment variables
database.configure_from_env()

# Initialize tables
await database.init_db()
```

### Handler System

Handlers implement the actual database operations. Currently, only PostgreSQL is supported.

**Handler Selection:**
- Set via `DB_TYPE` or `DATABASE_TYPE` environment variable
- Default: `postgres`
- Configured handler: `PostgresHandler` from `db/pg/handler.py`

## Data Types

**File**: `db/types.py`

### ChannelSnapshot
```python
@dataclass(slots=True)
class ChannelSnapshot:
    id: str
    name: str
    type: str
    is_nsfw: bool = False
    settings_overrides: Optional[Dict[str, Any]] = None
```

### GuildSnapshot
```python
@dataclass(slots=True)
class GuildSnapshot:
    id: str
    name: str
    icon: str | None = None
    owner_user_id: str | None = None
    joined_at: datetime | None = None
    channels: Tuple[ChannelSnapshot, ...] = ()
```

### GuildSettings
```python
@dataclass(slots=True)
class GuildSettings:
    id: str
    settings: dict
    updated_at: datetime
```

## Facade API

### Initialization

#### `configure(handler) -> None`
Registers a database handler instance.

#### `configure_from_env() -> None`
Configures handler based on environment variables.

#### `init_db() -> None`
Ensures database is ready (connects and creates tables).

#### `get_handler()`
Returns the configured handler instance.

### Guild Operations

#### `upsert_guild(*, guild_id: str, name: str, icon: str | None, owner_user_id: str | None = None, joined_at=None) -> None`
Insert or update a single guild.

#### `upsert_guilds(guilds: Iterable[GuildSnapshot]) -> None`
Batch upsert multiple guilds.

#### `delete_guilds(guild_ids: list[str]) -> None`
Delete guilds by ID.

#### `touch_guild(guild_id: str) -> None`
Update the `last_seen_at` timestamp for a guild.

### Guild Settings Operations

#### `get_guild_settings(guild_id: str)`
Fetch settings for a guild.

#### `ensure_guild_settings(guild_id: str, defaults: Optional[dict] = None)`
Ensure settings exist for a guild, creating with defaults if needed.

#### `update_guild_settings(guild_id: str, values: dict) -> None`
Merge JSON fields into existing settings (partial update).

#### `set_guild_settings(guild_id: str, settings: Mapping[str, Any])`
Replace entire settings JSON for a guild (full overwrite).

### Channel Operations

#### `upsert_channels_for_guild(guild_id: str, channels: Iterable[ChannelSnapshot]) -> None`
Batch upsert channels for a guild.

#### `get_channels_by_guild(guild_id: str)`
Fetch channels for a guild, ordered by name then ID.

#### `set_channel_reading(channel_id: str, is_reading: bool) -> None`
Toggle channel reading state.

#### `update_channel_cursor(channel_id: str, last_message_id: Optional[str]) -> None`
Update the last processed message ID for a channel.

#### `update_channel_progress(channel_id: str, last_seen_message_id: str, ingested_count: int) -> None`
Update channel cursor and message count after ingestion.

#### `touch_channel_activity(channel_id: str) -> None`
Update `last_activity_at` timestamp.

#### `increment_channel_message_count(channel_id: str, by: int = 1) -> None`
Increment message counter.

#### `update_channel_settings(channel_id: str, values: Mapping[str, Any])`
Merge JSON fields into channel settings.

#### `set_channel_settings(channel_id: str, settings: Mapping[str, Any])`
Replace entire channel settings.

#### `delete_channels(channel_ids: Iterable[str]) -> None`
Delete channels by ID.

### Channel Scan Run Operations

#### `enqueue_scan_run(channel_id: str) -> Optional[str]`
Enqueue a scan run if channel is in reading mode. Returns run ID or None.

#### `mark_scan_started(run_id: str) -> bool`
Mark a scan run as started.

#### `update_scan_progress(run_id: str, scanned_inc: int = 0, matched_inc: int = 0)`
Increment scan progress counters.

#### `mark_scan_succeeded(run_id: str) -> bool`
Mark scan as succeeded.

#### `mark_scan_failed(run_id: str, error_message: str) -> bool`
Mark scan as failed with error message.

#### `mark_scan_canceled(run_id: str) -> bool`
Mark scan as canceled.

### Install Intents Operations

#### `purge_expired_install_intents(grace_seconds: int = 300) -> int`
Delete expired install intents using a grace window. Returns number of deleted rows.

## PostgreSQL Handler

**File**: `db/pg/handler.py`

### Configuration

Uses environment variables:
- `POSTGRES_HOST` or `DB_HOST` (default: localhost)
- `POSTGRES_PORT` or `DB_PORT` (default: 5432)
- `POSTGRES_USER` or `DB_USER` (default: postgres)
- `POSTGRES_PASSWORD` or `DB_PASSWORD` (default: postgres)
- `POSTGRES_DB` or `DB_NAME` (default: postgres)
- `POSTGRES_DSN` or `DATABASE_URL` (if set, overrides individual params)

### Repository Pattern

The handler delegates to repositories:
- `users`: UsersRepository
- `guilds`: GuildRepository
- `guild_settings`: GuildSettingsRepository
- `install_intents`: InstallIntentsRepository
- `channels`: ChannelsRepository
- `channel_scan_runs`: ChannelScanRunsRepository

### Connection Management

- Single async connection per handler
- Lazy connection establishment
- Configurable row factory (default: `dict_row`)
- Transactions for batch operations
- Auto-reconnect if connection is lost

### Methods

#### `connection() -> AsyncConnection`
Returns the active connection, creating if needed.

#### `close() -> None`
Closes the connection.

#### `initialize() -> None`
Creates all tables via repositories.

#### `execute(query: str, params: Optional[tuple] = None)`
Execute a query and return results.

#### `execute_one(query: str, params: Optional[tuple] = None)`
Execute a query and return single result.

## Transaction Handling

Repositories use transactions for batch operations:

```python
conn = await self._handler.connection()
async with conn.transaction():
    async with conn.cursor() as cur:
        await cur.executemany(sql, params)
```

## Error Handling

- Connection errors propagate to caller
- Transactions automatically rollback on exception
- Foreign key constraints enforced by database
- Cascade deletes configured for related data
