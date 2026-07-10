import os

import discord
from bot.services.container import author_service, guild_service, channel_service
from bot.services.scan_service import get_scan_service
from bot.services.message_batcher import get_message_batcher
from bot.logger import logger
from bot.services.channel_permissions import (
    invalidate_guild_permissions,
    invalidate_member_permissions,
)

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True  # Required for message.content access
intents.members = os.getenv("DISCORD_MEMBERS_INTENT", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

bot = discord.Client(intents=intents)


# --- Bot Events ---
@bot.event
async def on_ready():
    await guild_service.sync_guilds(bot)
    
    for guild in bot.guilds:
        await channel_service.sync_channels(bot, guild)
        # Redis may have survived a gateway outage/restart; never trust an old
        # decision after the startup reconciliation pass.
        await invalidate_guild_permissions(str(guild.id))

    # Repair stale author metadata and keep existing installations current after
    # deploying profile synchronization changes.
    await author_service.sync_existing_authors(bot)
    
    # Start message batcher for batching live messages
    message_batcher = get_message_batcher()
    await message_batcher.start()
    logger.info("MessageBatcher started")
    
    # Detect gaps and queue catch-up scans
    scan_service = get_scan_service()
    await scan_service.detect_and_queue_gaps(bot)


# --- Guild Events ---
@bot.event
async def on_guild_join(guild: discord.Guild):
    await guild_service.on_guild_join(guild)
    await channel_service.sync_channels(bot, guild)
    await invalidate_guild_permissions(str(guild.id))
    
    # Check for gaps if scanning was previously enabled
    scan_service = get_scan_service()
    await scan_service.check_guild_gaps(guild)


@bot.event
async def on_guild_update(before: discord.Guild, after: discord.Guild):
    await guild_service.on_guild_update(after)
    await invalidate_guild_permissions(str(after.id))


@bot.event
async def on_guild_remove(guild: discord.Guild):
    await guild_service.on_guild_remove(guild)
    await channel_service.remove_channels(guild)
    await invalidate_guild_permissions(str(guild.id))


# --- Channel Events ---
@bot.event
async def on_guild_channel_create(channel: discord.abc.GuildChannel):
    await channel_service.on_channel_crup(channel.guild, channel)
    await invalidate_guild_permissions(str(channel.guild.id))


@bot.event
async def on_guild_channel_update(before: discord.abc.GuildChannel, after: discord.abc.GuildChannel):
    # A category overwrite change affects every synchronized child channel.
    if isinstance(after, discord.CategoryChannel):
        await channel_service.sync_channels(bot, after.guild)
    else:
        await channel_service.on_channel_crup(after.guild, after)
    await invalidate_guild_permissions(str(after.guild.id))


@bot.event
async def on_guild_channel_delete(channel: discord.abc.GuildChannel):
    await channel_service.on_channel_delete(channel.guild, channel)
    await invalidate_guild_permissions(str(channel.guild.id))


# Role permissions can change effective channel access without a channel event.
@bot.event
async def on_guild_role_create(role: discord.Role):
    await channel_service.sync_channels(bot, role.guild)
    await invalidate_guild_permissions(str(role.guild.id))


@bot.event
async def on_guild_role_update(before: discord.Role, after: discord.Role):
    await channel_service.sync_channels(bot, after.guild)
    await invalidate_guild_permissions(str(after.guild.id))


@bot.event
async def on_guild_role_delete(role: discord.Role):
    await channel_service.sync_channels(bot, role.guild)
    await invalidate_guild_permissions(str(role.guild.id))


# --- User Events ---
# These events require SERVER MEMBERS INTENT in the Discord Developer Portal.

@bot.event
async def on_user_update(before: discord.User, after: discord.User):
    """
    Called when a user updates their profile (username, avatar, discriminator).
    This is a global event - not guild-specific.
    
    ⚠️ Requires SERVER MEMBERS INTENT enabled in Discord Developer Portal
    """
    await author_service.on_user_update(before, after)


@bot.event
async def on_member_update(before: discord.Member, after: discord.Member):
    """
    Called when a guild member updates (nickname, roles, status, activities).
    This is guild-specific.
    """
    if {role.id for role in before.roles} != {role.id for role in after.roles}:
        await invalidate_member_permissions(str(after.guild.id), str(after.id))

    await author_service.on_member_update(after)


@bot.event
async def on_member_join(member: discord.Member):
    """Called when a member joins a guild."""
    await invalidate_member_permissions(str(member.guild.id), str(member.id))


@bot.event
async def on_member_remove(member: discord.Member):
    """Called when a member leaves or is kicked from a guild."""
    await invalidate_member_permissions(str(member.guild.id), str(member.id))


# --- Message Events ---
@bot.event
async def on_message(message: discord.Message):
    """Called when a message is sent in a channel the bot can see."""
    # Ignore the bot's own messages
    if message.author.id == bot.user.id:
        return
    
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
    Called when messages are bulk deleted (e.g., a moderation purge).

    Without this handler, purged messages leave orphaned clips in the
    database with dead CDN URLs. Queue a deletion job per message, the
    same path as single deletions (worker skips messages it doesn't know).

    Payload attributes:
    - message_ids: Set[int]
    - channel_id: int
    - guild_id: Optional[int]
    - cached_messages: List[discord.Message]
    """
    # Only process guild messages (DMs have no guild_id)
    if not payload.guild_id:
        return

    scan_service = get_scan_service()
    for message_id in payload.message_ids:
        try:
            await scan_service.handle_message_deletion(
                guild_id=str(payload.guild_id),
                channel_id=str(payload.channel_id),
                message_id=str(message_id)
            )
        except Exception:
            logger.exception(
                f"Failed to queue deletion for bulk-deleted message {message_id} "
                f"in channel {payload.channel_id}"
            )
