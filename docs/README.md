# DiscordClipSaver Documentation

Welcome to the DiscordClipSaver documentation. This project consists of a Discord bot that tracks guilds and channels, with plans for video clip extraction and management.

## Documentation Index

**New?** Start with the [Guide Overview](./GUIDE_OVERVIEW.md) to understand which docs to read.

### Quick Links

- **[Functionality Summary](./FUNCTIONALITY_SUMMARY.md)** - Complete overview of implemented features
- **[Bot Documentation](./bot/README.md)** - Discord bot architecture and usage
- **[SQL Documentation](./sql/README.md)** - Database schema and design

### Comprehensive Guides

- **[Functional Specification](./FUNCTIONAL_SPEC.md)** - Requirements, behaviors, validation rules, Discord API
- **[Technical Specification](./TECHNICAL_SPEC.md)** - SOLID/DRY principles, error handling, security patterns
- **[Operational Guide](./OPERATIONAL_GUIDE.md)** - Deployment, monitoring, maintenance, troubleshooting
- **[Security Guide](./SECURITY_GUIDE.md)** - Authentication, validation, SQL injection prevention, compliance

### Bot Documentation

Detailed documentation for the Discord bot component:

- [**Bot Overview**](./bot/README.md) - Introduction and quick start
- [**Architecture**](./bot/architecture.md) - System design and data flow
- [**Services**](./bot/services.md) - Business logic layer documentation
- [**Database Operations**](./bot/database.md) - Database facade and operations
- [**Discord Events**](./bot/events.md) - Event handlers and Discord integration
- [**Scheduled Jobs**](./bot/jobs.md) - Background tasks and scheduling
- [**Configuration**](./bot/configuration.md) - Environment variables and settings

### Database Documentation

PostgreSQL schema documentation:

- [**Schema Overview**](./sql/README.md) - Database structure introduction
- [**Tables**](./sql/tables.md) - Detailed table definitions
- [**Relationships**](./sql/relationships.md) - Foreign keys and entity relationships
- [**Indexes**](./sql/indexes.md) - Index documentation and optimization
- [**Triggers**](./sql/triggers.md) - Database triggers and automation

### Implementation Guides

Comprehensive guides for building secure, maintainable code:

- [**Functional Specification**](./FUNCTIONAL_SPEC.md) - Use cases, data flows, validation rules, Discord API considerations
- [**Technical Specification**](./TECHNICAL_SPEC.md) - Architecture principles (SOLID, DRY), error handling strategies, security patterns
- [**Operational Guide**](./OPERATIONAL_GUIDE.md) - Deployment procedures, monitoring, troubleshooting, performance tuning
- [**Security Guide**](./SECURITY_GUIDE.md) - Authentication, input validation, SQL injection prevention, incident response

## Project Structure

```
DiscordClipSaver/
├── bot/                    # Discord bot application
│   ├── main.py            # Entry point
│   ├── bot.py             # Discord client and events
│   ├── api.py             # FastAPI REST API
│   ├── db/                # Database layer
│   ├── services/          # Business logic
│   ├── lib/               # Utilities
│   └── jobs/              # Scheduled tasks
├── interface/             # Web UI (future)
└── docs/                  # Documentation (you are here)
    ├── bot/               # Bot documentation
    └── sql/               # Database documentation
```

## Getting Started

### Prerequisites

- Python 3.10 or higher
- PostgreSQL database
- Discord Bot Token

### Quick Start

1. **Install Dependencies**
   ```bash
   cd bot
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   
   Create a `.env` file in the `bot/` directory:
   ```env
   BOT_TOKEN=your_discord_bot_token
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=discord_bot
   ```

3. **Run the Bot**
   ```bash
   python main.py
   ```

The bot will:
- Connect to Discord
- Sync all guilds and channels
- Start the REST API on port 8000
- Begin scheduled cleanup jobs

### Health Check

Once running, verify the bot is healthy:
```bash
curl http://localhost:8000/health
```

## Core Features

### ✅ Implemented

- Discord bot with guild/channel synchronization
- PostgreSQL database with automatic schema creation
- Guild and channel metadata persistence
- Per-guild settings management (JSONB)
- Scheduled jobs for database maintenance
- FastAPI REST API with health check
- Comprehensive logging
- Graceful shutdown handling

### 🚧 Planned

- Message scanning for video attachments
- Video file download and storage
- Web interface for managing tracked channels
- User authentication and authorization
- Channel scan history and analytics
- Message ingestion workers
- Video clip metadata extraction

## Technology Stack

- **Bot**: discord.py 2.6.3
- **Database**: PostgreSQL with psycopg 3.2.10 (async)
- **API**: FastAPI 0.118.0 + Uvicorn
- **Scheduling**: APScheduler 3.10.4
- **Config**: PyYAML, python-dotenv

## Development

### Code Organization

The bot follows a layered architecture:
- **Event Layer**: Discord event handlers (`bot.py`)
- **Service Layer**: Business logic (`services/`)
- **Database Layer**: Data persistence (`db/`)
- **Utility Layer**: Helpers and builders (`lib/`)

See [Architecture Documentation](./bot/architecture.md) for details.

### Database

PostgreSQL is used for persistence with:
- Async operations throughout
- Repository pattern for data access
- Automatic schema management
- JSONB for flexible settings

See [Database Documentation](./sql/README.md) for schema details.

## Contributing

When contributing, please:
1. Follow existing code patterns
2. Update relevant documentation
3. Test database operations
4. Verify Discord event handling
5. Check logs for errors

## Support

For issues or questions:
1. Check the relevant documentation section
2. Review the [Functionality Summary](./FUNCTIONALITY_SUMMARY.md)
3. Examine logs for error details
4. Verify environment configuration

## License

See project LICENSE file for details.
