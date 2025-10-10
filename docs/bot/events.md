# Discord Events Documentation

## Overview

The bot handles Discord events to keep the database synchronized with the current state of guilds and channels.

**File**: `bot.py`

## Bot Configuration

### Intents
```python
intents = discord.Intents.default()
intents.message_content = True
```

The bot requires `message_content` intent to read message content.

### Client Initialization
```python
bot = discord.Client(intents=intents)
bot.state = BotState()
```

A `BotState` instance is attached to track runtime data.

## Event Handlers

### `on_ready()`

**Triggered**: When the bot successfully connects to Discord.

**Purpose**: Initial synchronization of all guilds and channels.

**Flow:**
```python
@bot.event
async def on_ready():
    await guild_service.sync_guilds(bot)
    
    for guild in bot.guilds:
        await channel_service.sync_channels(bot, guild)
```

**Actions:**
1. Syncs all guilds the bot is connected to
2. For each guild, syncs all channels
3. Applies default settings where needed
4. Updates bot state

**Use Case**: Ensures database is up-to-date when bot starts.

---

### `on_guild_join(guild: discord.Guild)`

**Triggered**: When the bot is added to a new guild.

**Purpose**: Register the new guild in the database.

**Flow:**
```python
@bot.event
async def on_guild_join(guild: discord.Guild):
    await guild_service.on_guild_join(bot, guild)
```

**Actions:**
1. Creates guild record in database
2. Updates bot state
3. Applies default guild settings
4. Logs the join event

**Note**: Currently commented out is channel sync for the new guild. Can be enabled if immediate channel sync is needed.

---

### `on_guild_remove(guild: discord.Guild)`

**Triggered**: When the bot is removed from a guild or the guild is deleted.

**Purpose**: Clean up guild data from the database.

**Flow:**
```python
@bot.event
async def on_guild_remove(guild: discord.Guild):
    await guild_service.on_guild_remove(bot, guild)
```

**Actions:**
1. Deletes guild from database
2. Removes guild from bot state
3. Logs the removal event

**Note**: Related channels are automatically deleted via database cascade constraints.

**TODO**: Explicit channel removal logic can be added if needed.

---

### `on_message(message: discord.Message)`

**Triggered**: When any message is received in a channel the bot has access to.

**Purpose**: Currently logs messages for development visibility. Extensible for future message processing.

**Flow:**
```python
@bot.event
async def on_message(message: discord.Message):
    # Ignore the bot's own messages
    if message.author.id == bot.user.id:
        return
    
    # Dev visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)
```

**Actions:**
1. Filters out bot's own messages
2. Logs message ID, author, and content

**Future Enhancements:**
- Handle messages from previously unknown channels
- Trigger channel discovery for new channels
- Process message content for specific patterns
- Track message counts per channel

---

## Event Handler Guidelines

### Error Handling
- Exceptions in event handlers should not crash the bot
- Use try-except blocks for critical operations
- Log errors for debugging

### Async Operations
- All event handlers are async functions
- Use `await` for database and Discord API calls
- Avoid blocking operations

### State Management
- Update bot state after database operations
- Keep state consistent between Discord and database
- Use bot_state_service helpers for state updates

### Logging
- Log important events (guild join/remove, errors)
- Use appropriate log levels (info, debug, error)
- Include context (guild ID, channel ID, etc.)

## Future Event Handlers

### Potential Events to Handle

- `on_guild_update`: Track guild name/icon changes
- `on_guild_channel_create`: Add new channels dynamically
- `on_guild_channel_delete`: Remove deleted channels
- `on_guild_channel_update`: Update channel metadata
- `on_member_join`/`on_member_remove`: Track guild membership
- `on_message_edit`: Track message edits
- `on_message_delete`: Track message deletions

## Testing Event Handlers

When developing event handlers:
1. Test in a dedicated test guild
2. Verify database changes after events
3. Check bot state consistency
4. Monitor logs for errors
5. Test error conditions (database down, network issues)
