# Functional Specification

## Overview

This document outlines the functional requirements and behaviors of the Discord Clip Saver bot.

## Core Capabilities

### 1. Guild Management

#### Discovery and Sync
- **Function**: Automatically discover and track Discord guilds (servers)
- **Trigger**: Bot startup, guild join/remove events
- **Behavior**: 
  - Fetches all guilds bot has access to
  - Persists guild metadata (name, icon, owner, timestamps)
  - Updates last_seen timestamp on each sync
- **Error Handling**: Logs failures, continues with remaining guilds

#### Guild Events
- **on_guild_join**: Add new guild to database, apply default settings
- **on_guild_remove**: Remove guild and cascade delete related data
- **Validation**: Guild ID must be valid Discord snowflake

### 2. Channel Management

#### Discovery and Sync
- **Function**: Track all channels within guilds
- **Trigger**: Bot startup, per-guild after guild sync
- **Behavior**:
  - Discovers text, voice, category, thread channels
  - Stores channel metadata (name, type, NSFW status)
  - Maintains channel-specific settings as overrides
- **Error Handling**: Skip inaccessible channels, log permission errors

#### Channel State
- **Reading Toggle**: Enable/disable message ingestion per channel
- **Cursor Tracking**: Store last processed message ID for resumable operations
- **Activity Tracking**: Update last_activity timestamp on new messages

### 3. Settings Management

#### Guild Settings
- **Function**: Per-guild configuration storage
- **Storage**: JSONB in database for flexibility
- **Default Application**: Automatically apply defaults from settings.yaml
- **Operations**:
  - Partial update: Merge new values into existing settings
  - Full replacement: Overwrite entire settings object
- **Validation**: Settings must be valid JSON objects

#### Configuration Hierarchy
```
Global Defaults (settings.default.yml)
  └── Guild Settings (database)
       └── Channel Overrides (per channel in database)
```

### 4. Message Scanning

#### Scan Runs (Planned)
- **Function**: Scan channel history for video attachments
- **States**: queued → running → succeeded/failed/canceled
- **Progress**: Track messages_scanned and messages_matched
- **Resumability**: Use after_message_id to continue from cursor
- **Error Handling**: Mark failed with error_message, allow retry

#### Validation
- Channel must have is_reading = true to enqueue scan
- Message IDs validated as Discord snowflakes
- Progress counters cannot decrease

### 5. Data Persistence

#### Database Operations
- **Upsert Pattern**: Insert or update existing records
- **Batch Operations**: Multiple records in single transaction
- **Cascade Deletes**: Automatic cleanup of related records
- **Timestamp Tracking**: Auto-update modified timestamps

#### Data Integrity
- Foreign key constraints enforce relationships
- Transactions ensure atomic operations
- Unique constraints prevent duplicates

## User Interactions

### Bot Commands (Future)
- Configuration commands for guild admins
- Status check commands
- Manual sync triggers
- Scan operation controls

### API Endpoints (Future)
- Guild and channel listing
- Settings management
- Scan run status and history
- Health and metrics

## Discord API Considerations

### Rate Limiting
- **Strategy**: Respect Discord rate limits (50 requests per second)
- **Backoff**: Exponential backoff on 429 responses
- **Batching**: Use batch endpoints where available
- **Implementation**: discord.py handles automatically, monitor logs

### Intents
- **Required**: `guilds`, `guild_messages`, `message_content`
- **Privileged**: `message_content` requires Discord approval
- **Validation**: Bot fails fast if required intents missing

### Permissions
- **Minimum**: Read messages, view channels, read message history
- **Recommended**: Manage webhooks (future features)
- **Check**: Validate permissions before operations

### Snowflake IDs
- **Format**: 64-bit integers as strings
- **Validation**: Must be numeric, positive, reasonable timestamp
- **Comparison**: Numeric comparison for ordering (greatest = newest)

## Error Scenarios

### Discord API Errors
- **401 Unauthorized**: Invalid token → log and exit
- **403 Forbidden**: Missing permissions → skip operation, log
- **404 Not Found**: Guild/channel deleted → remove from database
- **429 Rate Limited**: Backoff and retry automatically
- **5xx Server Error**: Retry with exponential backoff

### Database Errors
- **Connection Lost**: Attempt reconnection, fail gracefully
- **Constraint Violation**: Log detailed error, rollback transaction
- **Timeout**: Cancel operation, log, potentially retry
- **Deadlock**: Automatic retry with backoff

### Application Errors
- **Invalid Configuration**: Fail fast on startup with clear message
- **Missing Settings**: Use defaults, log warning
- **Corrupt Data**: Skip record, log for manual review
- **Resource Exhaustion**: Graceful degradation, log alert

## Validation Rules

### Input Validation
- **Guild/Channel IDs**: Must be 17-19 digit numeric strings
- **Settings JSON**: Must parse as valid JSON object
- **Timestamps**: ISO 8601 format or None
- **Cron Expressions**: Valid 5-field crontab syntax

### Business Logic Validation
- Cannot enable reading on deleted channel
- Cannot queue scan for non-reading channel
- Cannot update cursor to older message ID
- Guild settings cannot exceed size limit (configurable)

## Data Flow Examples

### Guild Join Flow
```
Discord Event: on_guild_join(guild)
  ↓
guild_service.on_guild_join(bot, guild)
  ↓
gather_guilds() → build_guild_snapshot()
  ↓
db.upsert_guilds([snapshot])
  ↓
bot_state.add_or_update_guild(snapshot)
  ↓
settings_service.ensure_defaults_for_guilds([guild_id])
  ↓
Log: "Joined guild: {name} ({id})"
```

### Channel Sync Flow
```
Discord Event: on_ready()
  ↓
For each guild in bot.guilds:
  ↓
channel_service.sync_channels(bot, guild)
  ↓
gather_channels() → build_channel_snapshot() for each
  ↓
db.upsert_channels_for_guild(guild_id, snapshots)
  ↓
Log: Synced N channels for guild
```

## Performance Expectations

### Response Times
- Guild sync: < 5s for 100 guilds
- Channel sync: < 3s per guild (100 channels)
- Database operations: < 100ms for single record
- Batch operations: < 500ms for 100 records

### Resource Usage
- Memory: < 200MB baseline, +1MB per 100 channels
- Database connections: 1 persistent connection
- CPU: < 5% idle, < 30% during sync operations

### Scalability
- Supports 100+ guilds concurrently
- 10,000+ channels total
- Millions of messages scanned over time
- Settings size limit: 64KB per guild

## Compliance

### Discord Terms of Service
- Respects rate limits
- Proper intent declaration
- No automated user actions
- Data retention policies followed

### Data Privacy
- Only stores necessary metadata
- No message content stored (except for scan results)
- User IDs only for ownership tracking
- Deletion honored on guild removal
