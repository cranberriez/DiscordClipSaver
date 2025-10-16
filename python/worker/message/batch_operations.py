"""
Batch database operations for efficient bulk inserts/updates
"""
import logging
from typing import List, Dict
from shared.db.models import User, Message, Clip, Thumbnail
from worker.message.batch_context import BatchContext, ClipMetadata
from tortoise.exceptions import IntegrityError

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
    async def bulk_upsert_users(context: BatchContext) -> int:
        """
        Bulk upsert users.
        
        Args:
            context: BatchContext with users to upsert
            
        Returns:
            Number of users upserted
        """
        if not context.users_to_upsert:
            return 0
        
        users_data = list(context.users_to_upsert.values())
        
        # Use bulk_create with on_conflict to handle upserts
        for user_data in users_data:
            try:
                await User.update_or_create(
                    id=user_data.id,
                    defaults={
                        "username": user_data.username,
                        "discriminator": user_data.discriminator,
                        "avatar_url": user_data.avatar_url
                    }
                )
            except Exception as e:
                logger.error(f"Failed to upsert user {user_data.id}: {e}")
        
        logger.debug(f"Upserted {len(users_data)} users")
        return len(users_data)
    
    @staticmethod
    async def bulk_upsert_messages(context: BatchContext) -> int:
        """
        Bulk upsert messages.
        
        Args:
            context: BatchContext with messages to upsert
            
        Returns:
            Number of messages upserted
        """
        if not context.messages_to_upsert:
            return 0
        
        messages_data = list(context.messages_to_upsert.values())
        
        # Tortoise doesn't have great bulk upsert, so we'll use update_or_create
        for msg_data in messages_data:
            try:
                await Message.update_or_create(
                    id=msg_data.id,
                    defaults={
                        "channel_id": msg_data.channel_id,
                        "guild_id": msg_data.guild_id,
                        "author_id": msg_data.author_id,
                        "timestamp": msg_data.timestamp,
                        "content": msg_data.content
                    }
                )
            except Exception as e:
                logger.error(f"Failed to upsert message {msg_data.id}: {e}")
        
        logger.debug(f"Upserted {len(messages_data)} messages")
        return len(messages_data)
    
    @staticmethod
    async def bulk_upsert_clips(context: BatchContext) -> int:
        """
        Bulk upsert clips.
        
        Args:
            context: BatchContext with clips to upsert
            
        Returns:
            Number of clips upserted
        """
        if not context.clips_to_upsert:
            return 0
        
        clips_data = list(context.clips_to_upsert.values())
        
        # Upsert clips
        for clip_data in clips_data:
            try:
                await Clip.update_or_create(
                    id=clip_data.id,
                    defaults={
                        "message_id": clip_data.message_id,
                        "channel_id": clip_data.channel_id,
                        "guild_id": clip_data.guild_id,
                        "filename": clip_data.filename,
                        "file_size": clip_data.file_size,
                        "mime_type": clip_data.mime_type,
                        "cdn_url": clip_data.cdn_url,
                        "expires_at": clip_data.expires_at,
                        "thumbnail_status": clip_data.thumbnail_status,
                        "settings_hash": clip_data.settings_hash
                    }
                )
            except Exception as e:
                logger.error(f"Failed to upsert clip {clip_data.id}: {e}")
        
        logger.debug(f"Upserted {len(clips_data)} clips")
        return len(clips_data)
    
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
        from collections import Counter
        thumbnail_counts = Counter(thumbnails)
        
        # Clips with both thumbnails
        complete_clips = {
            clip_id for clip_id, count in thumbnail_counts.items()
            if count >= 2
        }
        
        logger.debug(f"Found {len(complete_clips)} clips with complete thumbnails from {len(clip_ids)} candidates")
        return complete_clips
