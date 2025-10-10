# Bot Architecture

## System Overview

The Discord bot uses a layered architecture with clear separation between Discord event handling, business logic, and data persistence.

## Architecture Layers

### 1. Entry Point (`main.py`)

The application entry point orchestrates:
- Database initialization
- FastAPI server startup (port 8000)
- Discord bot client startup
- Scheduled job registration
- Graceful shutdown handling

**Key Functions:**
- `main()`: Async entry point that coordinates all services
- Handles Windows-specific event loop configuration
- Manages concurrent execution of API and bot tasks

### 2. Discord Event Layer (`bot.py`)

Handles Discord events and delegates to services.

**Events Handled:**
- `on_ready`: Syncs guilds and channels on bot startup
- `on_guild_join`: Handles bot being added to a new guild
- `on_guild_remove`: Handles bot being removed from a guild
- `on_message`: Logs messages (extensible for future features)

### 3. Service Layer (`services/`)

Business logic orchestration.

#### Guild Service (`guild_service.py`)
- Discovers and syncs guilds
- Manages guild join/leave workflows
- Ensures default settings for guilds

#### Channel Service (`channel_service.py`)
- Syncs channels for guilds
- Manages channel reading state
- Tracks channel scan runs and progress

#### Settings Service (`settings_service.py`)
- Loads configuration from YAML
- Manages per-guild settings
- Provides settings defaults

#### Bot State Service (`bot_state_service.py`)
- Maintains ephemeral runtime state
- Tracks available guilds
- Manages status tags (e.g., "sync:guilds")

### 4. Database Layer (`db/`)

#### Database Facade (`database.py`)
- Provides async functions for all database operations
- Abstracts database implementation details
- Configurable handler system (currently PostgreSQL)

#### PostgreSQL Handler (`pg/handler.py`)
- Connection management
- Table initialization
- Repository coordination

#### Repositories (`pg/*.py`)
- `guilds.py`: Guild and guild settings operations
- `channels.py`: Channel and channel scan run operations
- `users.py`: User table schema
- `install_intents.py`: OAuth install intent tracking

### 5. Library Utilities (`lib/`)

Helper functions for common operations:
- `guild_gather.py`: Collects guild snapshots from Discord
- `channel_gather.py`: Collects channel snapshots from Discord
- `build_snapshot.py`: Converts Discord objects to data models
- `yaml_to_json.py`: YAML configuration parser

### 6. Jobs Layer (`jobs/`)

Scheduled background tasks using APScheduler:
- `scheduler.py`: Job registration and scheduling
- `purge_intents.py`: Periodic cleanup of expired install intents

### 7. API Layer (`api.py`)

FastAPI server for external access:
- Health check endpoint
- Future: Guild/channel management endpoints

## Data Flow

### Guild Sync Flow
```
Discord on_ready event
  → guild_service.sync_guilds()
    → gather_guilds() collects snapshots
    → db.upsert_guilds() persists to database
    → bot_state.set_guilds() updates runtime state
    → settings_service ensures default settings
```

### Channel Sync Flow
```
Discord on_ready event (per guild)
  → channel_service.sync_channels()
    → gather_channels() collects snapshots
    → db.upsert_channels_for_guild() persists to database
```

### Guild Join Flow
```
Discord on_guild_join event
  → guild_service.on_guild_join()
    → Reuses gather_guilds() for consistency
    → db.upsert_guilds() adds guild
    → bot_state.add_or_update_guild() updates state
    → settings_service ensures defaults
```

## Dependency Injection

Services use a simple container pattern (`services/container.py`):
- Singleton service instances
- Explicit dependency injection via constructors
- Clean import structure

## State Management

### Persistent State (Database)
- Guild metadata
- Channel metadata
- Settings (per-guild)
- Channel scan runs
- Install intents

### Ephemeral State (BotState)
- Available guilds map
- Status tags for transient operations

## Error Handling

- Database operations wrapped in transactions
- Graceful shutdown on KeyboardInterrupt
- Scheduler shutdown handling
- Connection cleanup on bot close

## Concurrency

The bot uses Python's asyncio for concurrent operations:
- Discord bot runs as async task
- FastAPI server runs as async task
- Database operations are fully async (psycopg3)
- Windows compatibility via SelectorEventLoopPolicy
