"""
Batch database operations for efficient bulk inserts/updates
"""
import logging
from collections import Counter
from typing import List, Dict
from shared.db.models import Clip, Thumbnail
from shared.db.repositories import bulk_operations
from worker.message.batch_context import BatchContext, ClipMetadata

logger = logging.getLogger(__name__)


class BatchDatabaseOperations:
    """Handles bulk database operations for batch processing"""
    
    @staticmethod
    async def load_existing_clips(
        channel_id: str,
        clip_ids: List[str]
    ) -> Dict[str, ClipMetadata]:
        """
        Load existing clips metadata in bulk.
        
        Args:
            channel_id: Channel snowflake
            clip_ids: List of clip IDs to check
            
        Returns:
            Dictionary mapping clip_id to ClipMetadata
        """
        if not clip_ids:
            return {}
        
        # Query clips in bulk
        clips = await Clip.filter(
            id__in=clip_ids,
            channel_id=channel_id
        ).only('id', 'thumbnail_status', 'settings_hash', 'expires_at')
        
        result = {}
        for clip in clips:
            result[clip.id] = ClipMetadata(
                clip_id=clip.id,
                thumbnail_status=clip.thumbnail_status,
                settings_hash=clip.settings_hash,
                expires_at=clip.expires_at
            )
        
        logger.debug(f"Loaded {len(result)} existing clips from {len(clip_ids)} candidates")
        return result
    
    @staticmethod
    async def bulk_upsert_authors(context: BatchContext) -> int:
        """
        Bulk upsert authors via shared repository.

        Args:
            context: BatchContext with authors to upsert

        Returns:
            Number of authors successfully upserted
        """
        if not context.authors_to_upsert:
            return 0

        authors_data = [
            {
                'user_id': author.user_id,
                'guild_id': author.guild_id,
                'username': author.username,
                'discriminator': author.discriminator,
                'avatar_url': author.avatar_url,
                'nickname': author.nickname,
                'display_name': author.display_name,
                'guild_avatar_url': author.guild_avatar_url,
            }
            for author in context.authors_to_upsert.values()
        ]

        success_count, failure_count = await bulk_operations.bulk_upsert_authors(authors_data)

        if failure_count > 0:
            logger.warning(f"Bulk upsert authors: {success_count} succeeded, {failure_count} failed")

        return success_count

    @staticmethod
    async def bulk_upsert_users(context: BatchContext) -> int:
        """
        Bulk upsert users via shared repository.
        
        Args:
            context: BatchContext with users to upsert
            
        Returns:
            Number of users successfully upserted
        """
        if not context.users_to_upsert:
            return 0
        
        # Convert to list of dicts for repository
        users_data = [
            {
                'id': user.id,
                'username': user.username,
                'discriminator': user.discriminator,
                'avatar_url': user.avatar_url
            }
            for user in context.users_to_upsert.values()
        ]
        
        success_count, failure_count = await bulk_operations.bulk_upsert_users(users_data)
        
        if failure_count > 0:
            logger.warning(f"Bulk upsert users: {success_count} succeeded, {failure_count} failed")
        
        return success_count
    
    @staticmethod
    async def bulk_upsert_messages(context: BatchContext) -> int:
        """
        Bulk upsert messages via shared repository.
        
        Args:
            context: BatchContext with messages to upsert
            
        Returns:
            Number of messages successfully upserted
        """
        if not context.messages_to_upsert:
            return 0
        
        # Convert to list of dicts for repository
        messages_data = [
            {
                'id': msg.id,
                'guild_id': msg.guild_id,
                'channel_id': msg.channel_id,
                'author_id': msg.author_id,
                'content': msg.content,
                'timestamp': msg.timestamp
            }
            for msg in context.messages_to_upsert.values()
        ]
        
        success_count, failure_count = await bulk_operations.bulk_upsert_messages(messages_data)
        
        if failure_count > 0:
            logger.warning(f"Bulk upsert messages: {success_count} succeeded, {failure_count} failed")
        
        return success_count
    
    @staticmethod
    async def bulk_upsert_clips(context: BatchContext) -> int:
        """
        Bulk upsert clips via shared repository.
        
        Args:
            context: BatchContext with clips to upsert
            
        Returns:
            Number of clips successfully upserted
        """
        if not context.clips_to_upsert:
            return 0
        
        # Convert to list of dicts for repository
        clips_data = [
            {
                'id': clip.id,
                'message_id': clip.message_id,
                'guild_id': clip.guild_id,
                'channel_id': clip.channel_id,
                'author_id': clip.author_id,
                'filename': clip.filename,
                'file_size': clip.file_size,
                'mime_type': clip.mime_type,
                'cdn_url': clip.cdn_url,
                'expires_at': clip.expires_at,
                'thumbnail_status': clip.thumbnail_status,
                'settings_hash': clip.settings_hash
            }
            for clip in context.clips_to_upsert.values()
        ]
        
        success_count, failure_count = await bulk_operations.bulk_upsert_clips(clips_data)
        
        if failure_count > 0:
            logger.warning(f"Bulk upsert clips: {success_count} succeeded, {failure_count} failed")
        
        return success_count
    
    @staticmethod
    async def check_existing_thumbnails(clip_ids: List[str]) -> set:
        """
        Check which clips already have completed thumbnails.
        
        Args:
            clip_ids: List of clip IDs to check
            
        Returns:
            Set of clip IDs that have both small and large thumbnails
        """
        if not clip_ids:
            return set()
        
        # Count thumbnails per clip
        thumbnails = await Thumbnail.filter(
            clip_id__in=clip_ids
        ).values_list('clip_id', flat=True)
        
        # Count occurrences (need 2 per clip: small and large)
        thumbnail_counts = Counter(thumbnails)
        
        # Clips with both thumbnails
        complete_clips = {
            clip_id for clip_id, count in thumbnail_counts.items()
            if count >= 2
        }
        
        logger.debug(f"Found {len(complete_clips)} clips with complete thumbnails from {len(clip_ids)} candidates")
        return complete_clips
