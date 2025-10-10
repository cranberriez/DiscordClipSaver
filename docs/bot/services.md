# Services Documentation

## Overview

Services contain the business logic layer of the bot. They orchestrate operations between Discord events and database persistence.

## Service Container

**File**: `services/container.py`

Simple singleton pattern for service instances:

```python
settings_service = SettingsService()
guild_service = GuildService(settings_service=settings_service)
channel_service = ChannelService(settings_service=settings_service)
```

## Guild Service

**File**: `services/guild_service.py`

Manages guild discovery, synchronization, and lifecycle events.

### Methods

#### `sync_guilds(bot: discord.Client) -> List[GuildSnapshot]`
Discovers all guilds the bot is connected to and syncs them to the database.

**Flow:**
1. Uses `status_scope` to mark "sync:guilds" status
2. Calls `gather_guilds()` to collect guild data
3. Batch upserts guilds to database
4. Updates bot state with guild snapshots
5. Ensures default settings for all guilds

**Returns:** List of `GuildSnapshot` objects

#### `on_guild_join(bot: discord.Client, guild: discord.Guild) -> None`
Handles the bot joining a new guild.

**Flow:**
1. Gathers updated guild list
2. Finds the new guild snapshot
3. Upserts to database
4. Updates bot state
5. Ensures default settings

#### `on_guild_remove(bot: discord.Client, guild: discord.Guild) -> None`
Handles the bot being removed from a guild.

**Flow:**
1. Deletes guild from database
2. Removes from bot state
3. Logs the removal

## Channel Service

**File**: `services/channel_service.py`

Manages channel discovery, synchronization, and scan operations.

### Methods

#### `sync_channels(bot: discord.Client, guild: discord.Guild) -> List[ChannelSnapshot]`
Discovers all channels in a guild and syncs them to the database.

**Flow:**
1. Uses `status_scope` to mark "sync:channels" status
2. Calls `gather_channels()` to collect channel data
3. Batch upserts channels to database

**Returns:** List of `ChannelSnapshot` objects

#### `upsert_for_guild(guild_id: str, channels: Iterable[ChannelSnapshot]) -> None`
Batch upserts channels for a specific guild.

#### `list_by_guild(guild_id: str)`
Returns all channels for a guild, ordered by name then ID.

#### `set_reading(channel_id: str, is_reading: bool) -> None`
Toggles whether the bot is reading/ingesting messages from a channel.

#### `update_channel_progress(channel_id: str, last_seen_message_id: str, ingested_count: int) -> None`
Updates the ingest cursor and message count after processing a batch of messages.

### Scan Run Methods

Methods for tracking message scan progress (for finding video files):

- `enqueue_scan(channel_id: str) -> Optional[str]`: Queue a scan run
- `mark_scan_started(run_id: str) -> bool`: Mark scan as started
- `update_scan_progress(run_id: str, scanned_inc: int, matched_inc: int)`: Update counters
- `mark_scan_succeeded(run_id: str) -> bool`: Mark scan as complete
- `mark_scan_failed(run_id: str, error_message: str) -> bool`: Mark scan as failed
- `mark_scan_canceled(run_id: str) -> bool`: Cancel a scan

## Settings Service

**File**: `services/settings_service.py`

Single source of truth for configuration and default settings.

### Configuration

Loads settings from `settings.default.yml` in the project root (configurable via constructor).

### Methods

#### `reload_config(yaml_source: str | Path | None = None) -> None`
Reloads configuration from YAML file.

#### `get_config(*keys: str, default: Any = ...) -> Any`
Nested lookup into configuration.

**Examples:**
```python
# Get entire config
config = settings_service.get_config()

# Get nested value
purge_cron = settings_service.get_config("database_settings_defaults", "install_intent_purge_cron")

# With default
grace = settings_service.get_config("database_settings_defaults", "grace_seconds", default=360)
```

#### `get_guild_settings(guild_id: str) -> GuildSettings`
Fetches stored settings for a guild from the database.

#### `set_guild_settings_from_yaml(guild_id: str, yaml_source: str | Path | None = None, *, settings_key: str = "guild_settings_defaults") -> dict`
Persists guild settings from a YAML source.

#### `ensure_defaults_for_guilds(guild_ids: Iterable[str]) -> None`
Applies default settings for guilds that don't have stored settings.

**Behavior:**
- Checks if guild has existing settings
- Skips guilds with populated settings
- Uses `DEFAULT_SETTINGS_PATH` env var if set
- Logs success/failure for each guild

## Bot State Service

**File**: `services/bot_state_service.py`

Manages ephemeral runtime state attached to the bot client.

### State Structure

**File**: `services/state.py`

```python
@dataclass(slots=True)
class BotState:
    available_guilds: Dict[str, GuildSnapshot]
    status_tags: Set[str]
```

### Methods

#### Guild State Management

- `get_state(bot: discord.Client) -> BotState`: Get or create bot state
- `set_guilds(bot: discord.Client, snapshots: Iterable[GuildSnapshot]) -> None`: Set all guilds
- `add_or_update_guild(bot: discord.Client, snapshot: GuildSnapshot) -> None`: Add/update single guild
- `remove_guild(bot: discord.Client, guild_id: str) -> None`: Remove guild from state

#### Status Tag Management

- `add_status(bot: discord.Client, tag: str) -> None`: Add status tag
- `remove_status(bot: discord.Client, tag: str) -> None`: Remove status tag
- `has_status(bot: discord.Client, tag: str) -> bool`: Check if tag exists
- `statuses(bot: discord.Client) -> Set[str]`: Get all status tags

#### Status Scope Context Manager

```python
async with status_scope(bot, "sync:guilds"):
    # Status tag is active during this block
    await perform_sync()
# Status tag automatically removed
```

## Service Dependencies

```
SettingsService (no dependencies)
  ↓
GuildService (depends on SettingsService)
  ↓
ChannelService (depends on SettingsService)
```

Bot state service is independent and provides utilities for all services.
