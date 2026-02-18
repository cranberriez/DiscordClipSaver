"""
Batch message processor for efficient processing of multiple messages
"""
import logging
from typing import List, Optional
import discord
from shared.settings_resolver import get_channel_settings
from worker.message.batch_context import BatchContext
from worker.message.batch_operations import BatchDatabaseOperations
from worker.discord.bot import WorkerBot
from worker.thumbnail.thumbnail_handler import ThumbnailHandler
from worker.message.utils import compute_settings_hash
from worker.message.validators import should_process_message, filter_video_attachments
from worker.message.clip_metadata import build_clip_id_map, get_all_clip_ids, extract_clip_info
from shared.db.models import Clip

logger = logging.getLogger(__name__)


class BatchMessageProcessor:
    """
    Processes multiple messages in a batch with optimized database calls.
    
    Key optimizations:
    - Settings fetched once per batch
    - Existing clips loaded in bulk
    - Users/messages/clips upserted in batches
    - Thumbnail existence checked in bulk
    """
    
    def __init__(self, bot: WorkerBot, thumbnail_handler: Optional[ThumbnailHandler] = None):
        self.bot = bot
        self.db_ops = BatchDatabaseOperations()
        self.thumbnail_handler = thumbnail_handler or ThumbnailHandler()
    
    async def process_messages_batch(
        self,
        messages: List[discord.Message],
        channel_id: str,
        guild_id: str,
        existing_author_ids: set = None,
        is_update_scan: bool = False
    ) -> tuple[int, int]:
        """
        Process a batch of messages efficiently.
        
        Args:
            messages: List of Discord messages
            channel_id: Channel snowflake
            guild_id: Guild snowflake
            
        Returns:
            Tuple of (clips_found, thumbnails_generated)
        """
        if not messages:
            return 0, 0
        
        logger.info(f"Starting batch processing of {len(messages)} messages")
        
        # Fetch settings and initialize context
        settings = await get_channel_settings(guild_id, channel_id)
        context = self._initialize_context(
            guild_id, channel_id, settings, existing_author_ids, is_update_scan
        )
        
        # Pre-filter and extract clip metadata
        clip_map = build_clip_id_map(messages, channel_id, settings)
        clip_ids = get_all_clip_ids(clip_map)
        
        # Load existing clips in bulk
        context.existing_clips = await self.db_ops.load_existing_clips(
            channel_id=channel_id,
            clip_ids=clip_ids
        )
        
        logger.debug(
            f"Found {len(context.existing_clips)} existing clips from "
            f"{len(clip_ids)} potential clips"
        )
        
        # Fetch full member objects for authors who posted clips
        await self._fetch_and_process_authors(messages, clip_map, context)


        # Process messages and collect data
        self._collect_message_data(messages, clip_map, context)
        
        # Bulk upsert all collected data
        await self._bulk_upsert_data(context)
        
        # Generate thumbnails
        thumbnails_generated = await self._generate_thumbnails(context)
        
        self._log_summary(context, thumbnails_generated)
        
        return context.clips_found, thumbnails_generated
    
    def _initialize_context(
        self,
        guild_id: str,
        channel_id: str,
        settings,
        existing_author_ids: set,
        is_update_scan: bool
    ) -> BatchContext:
        """Initialize batch context with settings"""
        settings_hash = compute_settings_hash(settings)
        return BatchContext(
            guild_id=guild_id,
            channel_id=channel_id,
            settings=settings,
            settings_hash=settings_hash,
            existing_author_ids=existing_author_ids,
            is_update_scan=is_update_scan
        )
    
    async def _fetch_and_process_authors(self, messages: List[discord.Message], clip_map: dict, context: BatchContext) -> None:
        """Fetch full member objects for authors who posted clips."""
        # Only get author IDs for messages that have clips
        author_ids = {msg.author.id for msg in messages if str(msg.id) in clip_map}
        if not author_ids:
            return

        guild = self.bot.get_guild(int(context.guild_id))
        if not guild:
            logger.warning(f"Could not find guild {context.guild_id} in cache to get member data.")
            return

        # Get members from cache
        # Note: get_member is a cache lookup, not an API call
        member_map = {author_id: guild.get_member(author_id) for author_id in author_ids}

        found_in_cache = 0
        missing_in_cache = 0

        for author_id in author_ids:
            member = member_map.get(author_id)
            if member:
                found_in_cache += 1
                context.add_author(member)
            else:
                missing_in_cache += 1
                # Find a message from this author to get the user object as a fallback
                author_message = next((msg for msg in messages if msg.author.id == author_id and str(msg.id) in clip_map), None)
                if author_message:
                    # Log if we're falling back to User object (limited data) instead of Member
                    if missing_in_cache <= 5:  # Only log first few to avoid spam
                        logger.debug(f"Author {author_id} not in guild cache, using message.author fallback (Type: {type(author_message.author)})")
                    context.add_user(author_message.author)
        
        if missing_in_cache > 0:
            logger.info(f"Author processing: {found_in_cache} found in guild cache, {missing_in_cache} missing (fell back to message data)")
        else:
            logger.debug(f"Author processing: All {found_in_cache} authors found in guild cache")

    def _collect_message_data(
        self,
        messages: List[discord.Message],
        clip_map: dict,
        context: BatchContext
    ) -> None:
        """Collect message and clip data. Author data is pre-fetched."""
        for message in messages:
            message_id = str(message.id)

            if message_id not in clip_map:
                continue

            author_id = str(message.author.id)
            
            context.add_message(
                message_id=message_id,
                author_id=author_id,
                timestamp=message.created_at,
                content=message.content or ""
            )
            
            # Process clips for this message
            for clip_info in clip_map[message_id]:
                context.add_clip(
                    clip_id=clip_info.clip_id,
                    message_id=clip_info.message_id,
                    author_id=author_id,
                    filename=clip_info.filename,
                    file_size=clip_info.file_size,
                    mime_type=clip_info.mime_type,
                    cdn_url=clip_info.cdn_url,
                    expires_at=clip_info.expires_at,
                    thumbnail_status="pending"
                )
    
    async def _bulk_upsert_data(self, context: BatchContext) -> None:
        """Bulk upsert authors, messages, and clips"""
        await self.db_ops.bulk_upsert_authors(context)
        await self.db_ops.bulk_upsert_messages(context)
        await self.db_ops.bulk_upsert_clips(context)
    
    async def _generate_thumbnails(self, context: BatchContext) -> int:
        """Generate thumbnails for clips that need them"""
        thumbnails_generated = 0
        
        if not context.clips_needing_thumbnails:
            return 0
        
        logger.info(
            f"Generating thumbnails for {len(context.clips_needing_thumbnails)} clips"
        )
        
        # Bulk fetch clips to avoid N+1 query pattern
        clip_ids = [c.id for c in context.clips_needing_thumbnails]
        clips = await Clip.filter(id__in=clip_ids).all()
        clips_map = {c.id: c for c in clips}
        
        for clip_data in context.clips_needing_thumbnails:
            clip = clips_map.get(clip_data.id)
            if clip:
                success = await self.thumbnail_handler.process_clip(clip)
                if success:
                    thumbnails_generated += 1
                    context.thumbnails_generated += 1
        
        return thumbnails_generated
    
    def _log_summary(self, context: BatchContext, thumbnails_generated: int) -> None:
        """Log batch processing summary"""
        logger.info(
            f"Batch processing complete: {context.clips_found} clips found, "
            f"{context.thumbnails_skipped} thumbnails skipped, "
            f"{thumbnails_generated} thumbnails generated"
        )
