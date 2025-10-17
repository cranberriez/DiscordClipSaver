import discord
from bot.services.container import guild_service, channel_service
from bot.services.scan_service import get_scan_service
from bot.logger import logger

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True  # Required for message.content access
# intents.members = True  # TODO: Enable in Discord Developer Portal when implementing member events

bot = discord.Client(intents=intents)


# --- Bot Events ---
@bot.event
async def on_ready():
    await guild_service.sync_guilds(bot)
    
    for guild in bot.guilds:
        await channel_service.sync_channels(bot, guild)
    
    # Detect gaps and queue catch-up scans
    scan_service = get_scan_service()
    await scan_service.detect_and_queue_gaps(bot)


# --- Guild Events ---
@bot.event
async def on_guild_join(guild: discord.Guild):
    await guild_service.on_guild_join(guild)
    await channel_service.sync_channels(bot, guild)


@bot.event
async def on_guild_update(guild: discord.Guild):
    await guild_service.on_guild_update(guild)


@bot.event
async def on_guild_remove(guild: discord.Guild):
    await guild_service.on_guild_remove(guild)
    await channel_service.remove_channels(guild)


# --- Channel Events ---
@bot.event
async def on_guild_channel_create(channel: discord.abc.GuildChannel):
    await channel_service.on_channel_crup(channel.guild, channel)


@bot.event
async def on_guild_channel_update(before: discord.abc.GuildChannel, after: discord.abc.GuildChannel):
    await channel_service.on_channel_crup(after.guild, after)


@bot.event
async def on_guild_channel_delete(channel: discord.abc.GuildChannel):
    await channel_service.on_channel_delete(channel.guild, channel)


# --- User Events ---
# NOTE: These events require SERVER MEMBERS INTENT to be enabled in Discord Developer Portal
# Currently disabled - enable intents.members = True above when ready to implement

@bot.event
async def on_user_update(before: discord.User, after: discord.User):
    """
    Called when a user updates their profile (username, avatar, discriminator).
    This is a global event - not guild-specific.
    
    ⚠️ Requires SERVER MEMBERS INTENT enabled in Discord Developer Portal
    """
    # TODO: Update user record in database (username, avatar_url, discriminator)
    pass


@bot.event
async def on_member_update(before: discord.Member, after: discord.Member):
    """
    Called when a guild member updates (nickname, roles, status, activities).
    This is guild-specific.
    """
    # TODO: Update member-specific data (nickname, roles) if needed
    pass


@bot.event
async def on_member_join(member: discord.Member):
    """Called when a member joins a guild."""
    # TODO: Add member to database or log join event
    pass


@bot.event
async def on_member_remove(member: discord.Member):
    """Called when a member leaves or is kicked from a guild."""
    # TODO: Mark member as left or soft-delete
    pass


# --- Message Events ---
@bot.event
async def on_message(message: discord.Message):
    """Called when a message is sent in a channel the bot can see."""
    # Ignore the bot's own messages
    if message.author.id == bot.user.id:
        return
    # Dev visibility
    logger.info("[%s] %s: %s", message.id, message.author, message.content)
    
    # Handle message scanning (lightweight - just checks for attachments and queues job)
    scan_service = get_scan_service()
    await scan_service.handle_new_message(message)
    
    # TODO: Handle messages from previously unknown channels, fetch single channel and add
    # TODO: Handle messages from unknown guilds, fetch single guild and add


@bot.event
async def on_message_delete(message: discord.Message):
    """
    Called when a message is deleted (only if message is in cache).
    For uncached messages, use on_raw_message_delete.
    """
    # TODO: Mark message as deleted in database (set deleted_at timestamp)
    # TODO: Optionally mark associated clips as deleted
    pass


@bot.event
async def on_message_edit(before: discord.Message, after: discord.Message):
    """
    Called when a message is edited (only if message is in cache).
    For uncached messages, use on_raw_message_edit.
    """
    # TODO: Update message content in database
    # TODO: Check if attachments changed (clips added/removed)
    pass


@bot.event
async def on_raw_message_delete(payload: discord.RawMessageDeleteEvent):
    """
    Called when a message is deleted (works even if message not in cache).
    Queues a deletion job for worker to handle full cleanup.
    
    Payload attributes:
    - message_id: int
    - channel_id: int
    - guild_id: Optional[int]
    - cached_message: Optional[discord.Message]
    """
    # Only process guild messages (DMs have no guild_id)
    if not payload.guild_id:
        return
    
    # Queue deletion job via scan service
    # Worker will: delete from DB, delete thumbnails from storage
    scan_service = get_scan_service()
    await scan_service.handle_message_deletion(
        guild_id=str(payload.guild_id),
        channel_id=str(payload.channel_id),
        message_id=str(payload.message_id)
    )


@bot.event
async def on_raw_message_edit(payload: discord.RawMessageUpdateEvent):
    """
    Called when a message is edited (works even if message not in cache).
    
    Payload attributes:
    - message_id: int
    - channel_id: int
    - guild_id: Optional[int]
    - data: dict (raw message data from Discord)
    - cached_message: Optional[discord.Message]
    """
    # TODO: Update message using raw payload data
    pass


@bot.event
async def on_raw_bulk_message_delete(payload: discord.RawBulkMessageDeleteEvent):
    """
    Called when messages are bulk deleted (e.g., channel purge).
    
    Payload attributes:
    - message_ids: Set[int]
    - channel_id: int
    - guild_id: Optional[int]
    - cached_messages: List[discord.Message]
    """
    # TODO: Bulk mark messages as deleted (efficient batch operation)
    # TODO: Important for handling channel purges
    pass
