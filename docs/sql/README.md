# Database Schema Documentation

## Overview

The Discord Bot uses PostgreSQL to persist guild, channel, user, and operational data. The schema is automatically created on bot startup.

## Database Tables

- **users**: Discord user information
- **bot_guilds**: Discord guilds (servers) the bot is in
- **guild_settings**: Per-guild configuration stored as JSONB
- **bot_channels**: Discord channels within guilds
- **bot_channel_scan_runs**: Message scan operation tracking
- **install_intents**: OAuth installation flow state tracking

## Key Features

- **Async Operations**: All operations use psycopg3 async API
- **Automatic Timestamps**: `created_at`, `updated_at`, `last_seen_at` fields
- **JSONB Settings**: Flexible settings storage with JSON merging
- **Cascade Deletes**: Related records auto-delete when parent is removed
- **Triggers**: Auto-update `updated_at` on row changes
- **Indexes**: Optimized for common query patterns

## Schema Files

- [Tables](./tables.md) - Detailed table schemas
- [Relationships](./relationships.md) - Foreign key relationships
- [Indexes](./indexes.md) - Index definitions and rationale
- [Triggers](./triggers.md) - Trigger functions

## Connection

The bot connects using environment variables:
- Host, port, user, password, database name
- Or full DSN/DATABASE_URL connection string

See [Configuration](../bot/configuration.md) for details.

## Schema Management

Tables are created automatically via repository `ensure_tables()` methods during `database.init_db()`.

No manual SQL execution required - the bot handles all schema creation.
