# Technical Specification

## Architecture Principles

### SOLID Principles

#### Single Responsibility Principle (SRP)
- **Services**: Each service handles one domain (guilds, channels, settings)
- **Repositories**: Each repository manages one table
- **Events**: Each event handler delegates to appropriate service
- **Example**: `GuildService` only handles guild operations, not channel logic

#### Open/Closed Principle (OCP)
- **Database Handlers**: Facade allows new handlers without changing calling code
- **Settings**: JSONB allows extension without schema changes
- **Repositories**: New methods added without modifying existing ones

#### Liskov Substitution Principle (LSP)
- **Row Factories**: Any psycopg row factory works with repositories
- **Handler Interface**: New database handlers must implement same interface
- **Snapshots**: Dataclasses can be replaced with compatible structures

#### Interface Segregation Principle (ISP)
- **Repository Methods**: Specific methods instead of monolithic CRUD
- **Service Dependencies**: Services only depend on what they use
- **Facade Functions**: Specific functions for each operation

#### Dependency Inversion Principle (DIP)
- **Database Facade**: High-level code depends on abstract database interface
- **Service Container**: Services receive dependencies via constructor
- **Handler Configuration**: Handler implementation chosen at runtime

### DRY Principle Implementation

#### Code Reuse Patterns

**Snapshot Builders** (`lib/build_snapshot.py`)
```python
# Single function used everywhere for guild conversion
build_guild_snapshot(guild: discord.Guild) -> GuildSnapshot

# Single function used everywhere for channel conversion
build_channel_snapshot(channel: discord.abc.GuildChannel) -> ChannelSnapshot
```

**Gather Functions** (`lib/guild_gather.py`, `lib/channel_gather.py`)
```python
# Reused in sync and join operations
gather_guilds(bot: Client) -> Iterable[GuildSnapshot]
gather_channels(bot: Client, guild: Guild) -> Iterable[ChannelSnapshot]
```

**Status Scope Context Manager**
```python
# Reused across all sync operations
async with status_scope(bot, "sync:guilds"):
    # operation
```

**Database Transactions**
```python
# Pattern reused in all repositories
async with conn.transaction():
    async with conn.cursor() as cur:
        await cur.executemany(sql, params)
```

#### Configuration Reuse
- Single `SettingsService` instance loaded once
- Shared across all services via container
- YAML loaded once, accessed many times

#### Repository Patterns
- Base SQL patterns reused with parameters
- Transaction handling standardized
- Error handling consistent across repositories

## Error Handling Strategy

### Error Hierarchy

```
Application Errors
├── Configuration Errors (fail fast)
├── Discord API Errors (retry or skip)
├── Database Errors (rollback and log)
└── Business Logic Errors (validate and reject)
```

### Discord API Error Handling

#### Rate Limiting (429)
```python
# Handled by discord.py automatically
# Logs warning and waits before retry
# Configure max_messages and delay parameters
```

#### Permission Errors (403)
```python
try:
    await channel.history().flatten()
except discord.Forbidden:
    logger.warning("Missing permissions for channel %s", channel.id)
    # Skip channel, continue with others
    continue
```

#### Not Found (404)
```python
try:
    guild = await bot.fetch_guild(guild_id)
except discord.NotFound:
    # Clean up deleted guild
    await db.delete_guilds([guild_id])
    logger.info("Removed deleted guild %s", guild_id)
```

#### Authentication (401)
```python
# Fail fast - invalid token is fatal
try:
    await bot.start(TOKEN)
except discord.LoginFailure:
    logger.critical("Invalid bot token")
    sys.exit(1)
```

### Database Error Handling

#### Transaction Rollback
```python
async with conn.transaction():
    try:
        await cur.executemany(sql, params)
    except Exception as e:
        # Transaction auto-rolls back
        logger.exception("Batch operation failed: %s", e)
        raise
```

#### Connection Errors
```python
async def _ensure_connection(self):
    if self._conn is None or self._conn.closed:
        try:
            self._conn = await psycopg.AsyncConnection.connect(...)
        except psycopg.OperationalError as e:
            logger.critical("Database connection failed: %s", e)
            raise
    return self._conn
```

#### Constraint Violations
```python
try:
    await db.upsert_guild(...)
except psycopg.errors.ForeignKeyViolation as e:
    logger.error("FK constraint violation: %s", e)
    # Don't retry - data is invalid
    raise
```

### Validation Strategy

#### Input Validation

**Discord IDs (Snowflakes)**
```python
def validate_snowflake(id_str: str) -> bool:
    """Validate Discord snowflake ID format."""
    if not id_str.isdigit():
        return False
    id_int = int(id_str)
    # Snowflakes are 64-bit, check reasonable range
    if id_int < 0 or id_int > 9223372036854775807:
        return False
    # Check timestamp is reasonable (after Discord epoch: 2015-01-01)
    timestamp_ms = (id_int >> 22) + 1420070400000
    # Reject IDs from before Discord existed or far future
    return 1420070400000 <= timestamp_ms <= 2524608000000
```

**Settings JSON**
```python
def validate_settings(settings: Any) -> dict:
    """Validate settings structure."""
    if not isinstance(settings, dict):
        raise ValueError("Settings must be a dictionary")
    
    # Size limit to prevent abuse
    json_str = json.dumps(settings)
    if len(json_str) > 65536:  # 64KB limit
        raise ValueError("Settings exceed 64KB limit")
    
    return settings
```

**Cron Expressions**
```python
def validate_cron(cron_expr: str) -> bool:
    """Validate cron expression format."""
    try:
        from apscheduler.triggers.cron import CronTrigger
        CronTrigger.from_crontab(cron_expr)
        return True
    except ValueError as e:
        logger.error("Invalid cron expression '%s': %s", cron_expr, e)
        return False
```

#### Business Logic Validation

**Channel Reading State**
```python
async def set_reading(self, channel_id: str, is_reading: bool) -> None:
    """Toggle channel reading with validation."""
    # Validate channel exists
    channels = await db.get_channels_by_guild(...)
    if channel_id not in [c['channel_id'] for c in channels]:
        raise ValueError(f"Channel {channel_id} not found")
    
    # Validate channel is not deleted
    # (handled by FK constraint, but explicit check for better error)
    
    await db.set_channel_reading(channel_id, is_reading)
```

**Message ID Cursor**
```python
async def update_progress(self, channel_id: str, last_seen_message_id: str, count: int):
    """Update channel progress with validation."""
    # Validate message ID format
    if not validate_snowflake(last_seen_message_id):
        raise ValueError(f"Invalid message ID: {last_seen_message_id}")
    
    # Validate count is positive
    if count < 0:
        raise ValueError("Message count cannot be negative")
    
    # Database enforces cursor only moves forward via numeric comparison
    await db.update_channel_progress(channel_id, last_seen_message_id, count)
```

### Graceful Degradation

#### Partial Failures
```python
# Continue with other guilds even if one fails
async def sync_guilds(self, bot):
    snapshots = await gather_guilds(bot)
    
    for snapshot in snapshots:
        try:
            await db.upsert_guilds([snapshot])
            await self._settings.ensure_defaults_for_guilds([snapshot.id])
        except Exception as e:
            logger.exception("Failed to sync guild %s: %s", snapshot.id, e)
            # Continue with next guild
            continue
```

#### Fallback Values
```python
# Use defaults when configuration is missing
purge_cron = settings_service.get_config(
    "database_settings_defaults",
    "install_intent_purge_cron",
    default="*/30 * * * *"  # Fallback to every 30 minutes
)
```

## Discord API Integration

### Rate Limit Handling

#### Global Rate Limit
- Discord.py handles automatically via bucket system
- Sleeps when rate limit hit
- Resumes after rate limit window

#### Per-Route Rate Limits
- Different limits for different endpoints
- Tracked automatically by discord.py
- Custom endpoints need manual tracking

#### Best Practices
```python
# Use bulk endpoints when available
await guild.fetch_members(limit=1000)  # Better than 1000 individual requests

# Batch database operations after Discord API calls
channels = [build_channel_snapshot(c) for c in guild.channels]
await db.upsert_channels_for_guild(guild_id, channels)  # Single transaction
```

### Gateway Intents

#### Required Intents
```python
intents = discord.Intents.default()
intents.message_content = True  # Required for reading message text
intents.members = False  # Optional, requires privileged approval
```

#### Privileged Intents
- `message_content`: Required for message scanning
- `members`: Not currently needed
- `presences`: Not needed

#### Validation
```python
def validate_intents(bot: discord.Client):
    """Ensure required intents are enabled."""
    if not bot.intents.message_content:
        raise RuntimeError("message_content intent is required")
    if not bot.intents.guilds:
        raise RuntimeError("guilds intent is required")
```

### Permission Checks

#### Before Operations
```python
async def can_read_channel(channel: discord.TextChannel) -> bool:
    """Check if bot has read permissions."""
    permissions = channel.permissions_for(channel.guild.me)
    return permissions.read_messages and permissions.read_message_history

# Usage
if await can_read_channel(channel):
    await channel.history().flatten()
else:
    logger.warning("Cannot read channel %s - missing permissions", channel.id)
```

#### Recommended Permissions
- View Channels
- Read Messages
- Read Message History
- (Future) Manage Webhooks for notifications

### Snowflake Handling

#### Storage
```python
# Store as TEXT in database for precision
# PostgreSQL BIGINT supports full range but TEXT is safer
CREATE TABLE bot_guilds (
    guild_id text primary key,  -- Not bigint
    ...
);
```

#### Comparison
```python
# Numeric comparison for ordering
UPDATE bot_channels
SET last_message_id = greatest(
    coalesce(nullif(last_message_id, '')::numeric, 0),
    %s::numeric
)::text
WHERE channel_id = %s
```

#### Generation Timestamp
```python
def snowflake_to_datetime(snowflake: str) -> datetime:
    """Extract timestamp from Discord snowflake."""
    snowflake_int = int(snowflake)
    timestamp_ms = (snowflake_int >> 22) + 1420070400000  # Discord epoch
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
```

## Async Patterns

### Concurrent Operations
```python
# Run bot and API concurrently
api_task = asyncio.create_task(server.serve())
bot_task = asyncio.create_task(bot.start(TOKEN))

try:
    await bot_task  # Wait for bot
finally:
    await api_task  # Cleanup API
```

### Database Transactions
```python
# All database operations use async/await
async with conn.transaction():
    await cur.execute(sql, params)
```

### Context Managers
```python
# Async context managers for resource cleanup
async with bot_state.status_scope(bot, "sync:guilds"):
    await perform_sync()
# Status automatically removed
```

## Security Considerations

### Secret Management
```python
# Never commit secrets
# Use environment variables
TOKEN = os.getenv("BOT_TOKEN")
if not TOKEN:
    raise RuntimeError("BOT_TOKEN not set")

# Use .gitignore to exclude .env files
```

### SQL Injection Prevention
```python
# Always use parameterized queries
await cur.execute(
    "SELECT * FROM bot_guilds WHERE guild_id = %s",
    (guild_id,)  # Parameterized, not f-string
)

# NEVER do this:
# await cur.execute(f"SELECT * FROM bot_guilds WHERE guild_id = '{guild_id}'")
```

### Input Sanitization
```python
# Validate all external input
def sanitize_guild_name(name: str) -> str:
    """Sanitize guild name for safe storage."""
    # Remove control characters
    sanitized = ''.join(c for c in name if c.isprintable())
    # Limit length
    return sanitized[:100]
```

### Permission Principle of Least Privilege
- Bot requests only necessary Discord permissions
- Database user has only required privileges
- API endpoints require authentication (future)

## Performance Optimization

### Batch Operations
```python
# Batch database inserts
await cur.executemany(sql, [(g.id, g.name, ...) for g in guilds])
# vs. multiple execute() calls
```

### Lazy Loading
```python
# Don't load all messages at once
async for message in channel.history(limit=100):
    # Process incrementally
    await process_message(message)
```

### Connection Pooling (Future)
```python
# Use connection pool for multiple workers
from psycopg_pool import AsyncConnectionPool
pool = AsyncConnectionPool(conninfo=dsn, min_size=5, max_size=20)
```

### Caching Strategy
- Guild snapshots cached in BotState
- Settings loaded once per operation
- Avoid repeated Discord API calls for same data

## Testing Considerations

### Unit Testing
- Mock Discord objects
- Mock database connections
- Test validation functions
- Test snapshot builders

### Integration Testing
- Use test database
- Test with actual Discord test guild
- Verify transaction behavior
- Test error handling paths

### Load Testing
- Simulate many guilds/channels
- Test rate limit handling
- Verify memory usage
- Check database performance
