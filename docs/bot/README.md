# Discord Bot Documentation

## Overview

This Discord bot is designed to track and manage Discord guilds (servers) and channels. It provides automatic synchronization of guild and channel data to a PostgreSQL database, along with a FastAPI REST interface for external access.

## Key Features

- **Guild Management**: Automatically syncs Discord guilds and tracks join/leave events
- **Channel Management**: Discovers and tracks channels within guilds
- **Database Persistence**: Stores guild and channel metadata in PostgreSQL
- **Settings Management**: Configurable per-guild settings via YAML
- **Scheduled Jobs**: Periodic cleanup tasks via APScheduler
- **REST API**: FastAPI server for health checks and future endpoints
- **Bot State Tracking**: Runtime state management for guilds and status

## Architecture

The bot follows a service-oriented architecture with clear separation of concerns:

- **Core Bot** (`bot.py`): Discord event handlers
- **Services**: Business logic layer for guilds, channels, and settings
- **Database Layer**: Async PostgreSQL operations via psycopg3
- **Jobs**: Scheduled background tasks
- **API**: FastAPI REST endpoints

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL database
- Discord Bot Token

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
BOT_TOKEN=your_discord_bot_token
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=discord_bot
```

3. Run the bot:
```bash
python main.py
```

## Directory Structure

```
bot/
├── main.py              # Application entry point
├── bot.py               # Discord bot client and event handlers
├── api.py               # FastAPI REST API
├── logger.py            # Logging configuration
├── db/                  # Database layer
│   ├── database.py      # Database facade
│   ├── types.py         # Data models
│   └── pg/              # PostgreSQL implementation
├── services/            # Business logic
│   ├── guild_service.py
│   ├── channel_service.py
│   ├── settings_service.py
│   └── bot_state_service.py
├── lib/                 # Utility functions
│   ├── guild_gather.py
│   ├── channel_gather.py
│   └── build_snapshot.py
└── jobs/                # Scheduled tasks
    ├── scheduler.py
    └── purge_intents.py
```

## Documentation Files

- [Architecture](./architecture.md) - Detailed system architecture
- [Services](./services.md) - Service layer documentation
- [Database](./database.md) - Database operations and facade
- [Events](./events.md) - Discord event handlers
- [Jobs](./jobs.md) - Scheduled background tasks
- [Configuration](./configuration.md) - Settings and environment variables

## Key Technologies

- **discord.py 2.6.3**: Discord API client library
- **FastAPI 0.118.0**: REST API framework
- **psycopg 3.2.10**: Async PostgreSQL adapter
- **APScheduler 3.10.4**: Scheduled job execution
- **PyYAML 6.0.3**: Configuration file parsing

## API Endpoints

### Health Check
- **GET** `/health` - Returns bot status

## Development

The bot runs both the Discord client and FastAPI server concurrently using asyncio. On Windows, it automatically sets the `WindowsSelectorEventLoopPolicy` for psycopg compatibility.

## Support

For issues or questions, refer to the individual documentation files in this directory.
