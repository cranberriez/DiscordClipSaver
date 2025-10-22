"""
Batch processing context to hold shared data and reduce database calls
"""
from dataclasses import dataclass, field
from typing import Dict, Set, List, Optional
from datetime import datetime, timezone
from shared.settings_resolver import ResolvedSettings
import discord


@dataclass
class ClipMetadata:
    """Metadata about an existing clip"""
    clip_id: str
    thumbnail_status: str
    settings_hash: str
    expires_at: datetime


@dataclass
class AuthorData:
    """Author data to be upserted"""
    user_id: str
    guild_id: str
    username: str
    discriminator: str
    avatar_url: Optional[str]
    nickname: Optional[str]
    display_name: str
    guild_avatar_url: Optional[str]


@dataclass
class UserData:
    """User data to be upserted"""
    id: str
    username: str
    discriminator: str
    avatar_url: Optional[str]


@dataclass
class MessageData:
    """Message data to be upserted"""
    id: str
    channel_id: str
    guild_id: str
    author_id: str
    timestamp: datetime
    content: str


@dataclass
class ClipData:
    """Clip data to be upserted"""
    id: str
    message_id: str
    channel_id: str
    guild_id: str
    filename: str
    file_size: int
    mime_type: str
    cdn_url: str
    expires_at: datetime
    thumbnail_status: str
    settings_hash: str


class BatchContext:
    """
    Context for batch message processing.
    Holds shared data to minimize database calls.
    """
    
    def __init__(
        self,
        guild_id: str,
        channel_id: str,
        settings: ResolvedSettings,
        settings_hash: str,
        existing_author_ids: Set[str] = None,
        is_update_scan: bool = False
    ):
        self.guild_id = guild_id
        self.channel_id = channel_id
        self.settings = settings
        self.settings_hash = settings_hash
        self.is_update_scan = is_update_scan
        
        # Existing data from database (loaded once)
        self.existing_clips: Dict[str, ClipMetadata] = {}
        self.existing_author_ids: Set[str] = existing_author_ids or set()
        
        # Data to be upserted (collected during processing)
        self.authors_to_upsert: Dict[str, AuthorData] = {}
        self.users_to_upsert: Dict[str, UserData] = {}
        self.messages_to_upsert: Dict[str, MessageData] = {}
        self.clips_to_upsert: Dict[str, ClipData] = {}
        
        # Clips that need thumbnail generation
        self.clips_needing_thumbnails: List[ClipData] = []
        
        # Statistics
        self.clips_found = 0
        self.thumbnails_skipped = 0
        self.thumbnails_generated = 0
    
    def add_author(self, author: discord.Member) -> None:
        """Add author data for batch upsert"""
        user_id = str(author.id)

        # If it's an update scan, always add/update the author.
        # If it's a normal scan, only add if they are new.
        if self.is_update_scan or user_id not in self.existing_author_ids:
            if user_id not in self.authors_to_upsert:
                self.authors_to_upsert[user_id] = AuthorData(
                    user_id=user_id,
                    guild_id=self.guild_id,
                    username=author.name,
                    discriminator=author.discriminator or "0",
                    avatar_url=str(author.avatar.url) if author.avatar else None,
                    nickname=author.nick,
                    display_name=author.display_name,
                    guild_avatar_url=str(author.display_avatar.url) if author.display_avatar else None,
                )

    def add_user(self, user: discord.User) -> None:
        """Add user data for batch upsert"""
        user_id = str(user.id)
        if user_id not in self.users_to_upsert:
            self.users_to_upsert[user_id] = UserData(
                id=user_id,
                username=user.name,
                discriminator=user.discriminator or "0",
                avatar_url=str(user.display_avatar.url) if user.display_avatar else None
            )
    
    def add_message(
        self,
        message_id: str,
        author_id: str,
        timestamp: datetime,
        content: str
    ) -> None:
        """Add message data for batch upsert"""
        if message_id not in self.messages_to_upsert:
            self.messages_to_upsert[message_id] = MessageData(
                id=message_id,
                channel_id=self.channel_id,
                guild_id=self.guild_id,
                author_id=author_id,
                timestamp=timestamp,
                content=content if self.settings.enable_message_content_storage else ""
            )
    
    def add_clip(
        self,
        clip_id: str,
        message_id: str,
        filename: str,
        file_size: int,
        mime_type: str,
        cdn_url: str,
        expires_at: datetime,
        thumbnail_status: str = "pending"
    ) -> bool:
        """
        Add clip data for batch upsert.
        
        Returns:
            True if clip needs thumbnail generation, False if it can be skipped
        """
        # Check if clip exists with same settings
        existing_clip = self.existing_clips.get(clip_id)
        
        if existing_clip:
            # Clip exists - check if we can skip thumbnail generation
            if (existing_clip.settings_hash == self.settings_hash and 
                existing_clip.thumbnail_status == "completed"):
                # Same settings and thumbnail already exists - skip
                self.thumbnails_skipped += 1
                # Still update CDN URL if expired
                if existing_clip.expires_at < datetime.now(timezone.utc):
                    self.clips_to_upsert[clip_id] = ClipData(
                        id=clip_id,
                        message_id=message_id,
                        channel_id=self.channel_id,
                        guild_id=self.guild_id,
                        filename=filename,
                        file_size=file_size,
                        mime_type=mime_type,
                        cdn_url=cdn_url,
                        expires_at=expires_at,
                        thumbnail_status="completed",
                        settings_hash=self.settings_hash
                    )
                return False
        
        # New clip or needs regeneration
        clip_data = ClipData(
            id=clip_id,
            message_id=message_id,
            channel_id=self.channel_id,
            guild_id=self.guild_id,
            filename=filename,
            file_size=file_size,
            mime_type=mime_type,
            cdn_url=cdn_url,
            expires_at=expires_at,
            thumbnail_status=thumbnail_status,
            settings_hash=self.settings_hash
        )
        
        self.clips_to_upsert[clip_id] = clip_data
        self.clips_found += 1
        
        # Determine if thumbnail generation is needed
        needs_thumbnail = (
            not existing_clip or  # New clip
            existing_clip.thumbnail_status in ["failed", "pending"] or  # Failed or pending
            existing_clip.settings_hash != self.settings_hash  # Settings changed
        )
        
        if needs_thumbnail:
            self.clips_needing_thumbnails.append(clip_data)
        else:
            self.thumbnails_skipped += 1
        
        return needs_thumbnail
    
    def should_skip_thumbnail(self, clip_id: str) -> bool:
        """Check if thumbnail generation should be skipped for a clip"""
        existing_clip = self.existing_clips.get(clip_id)
        if not existing_clip:
            return False
        
        return (
            existing_clip.settings_hash == self.settings_hash and
            existing_clip.thumbnail_status == "completed"
        )
