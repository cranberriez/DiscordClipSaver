"""
Centralized validation service for worker processing.

Handles guild/channel validation with Redis-based caching to reduce database calls.
All validation checks (NSFW, enabled status, etc.) are performed here before processing.
"""
import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, Tuple
from shared.db.models import Guild, Channel, ChannelType
from shared.user_settings_resolver import resolve_user_settings

logger = logging.getLogger(__name__)

# Cache TTL in seconds (2 hours)
CACHE_TTL_SECONDS = 7200


@dataclass
class ValidationContext:
    """Cached validation state for a guild/channel combination"""
    guild_id: str
    channel_id: str
    guild_enabled: bool
    channel_enabled: bool
    channel_type: str
    is_nsfw: bool
    ignore_nsfw: bool
    settings_hash: str
    cached_at: str  # ISO format string for JSON serialization
    
    def to_json(self) -> str:
        return json.dumps(asdict(self))
    
    @classmethod
    def from_json(cls, data: str) -> 'ValidationContext':
        parsed = json.loads(data)
        return cls(**parsed)


@dataclass
class ValidationResult:
    """Result of validation check"""
    should_process: bool
    reason: str = ""
    context: Optional[ValidationContext] = None


class ValidationService:
    """
    Centralized validation service that runs in workers.
    Handles guild/channel settings with Redis-based caching.
    """
    
    def __init__(self, redis_client=None):
        """
        Initialize validation service.
        
        Args:
            redis_client: Optional Redis client for caching. If None, caching is disabled.
        """
        self.redis_client = redis_client
        self.cache_ttl = CACHE_TTL_SECONDS
    
    async def validate_processing_context(
        self, 
        guild_id: str, 
        channel_id: str
    ) -> ValidationResult:
        """
        Validate that processing should proceed for the given guild/channel.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
            
        Returns:
            ValidationResult with decision and context
        """
        # Get validation context (cached or fresh)
        context = await self._get_validation_context(guild_id, channel_id)
        
        if context is None:
            return ValidationResult(
                should_process=False,
                reason="guild_or_channel_not_found"
            )
        
        # Guild-level validation
        if not context.guild_enabled:
            return ValidationResult(
                should_process=False,
                reason="guild_disabled",
                context=context
            )
        
        # Channel-level validation
        if not context.channel_enabled:
            return ValidationResult(
                should_process=False,
                reason="channel_disabled",
                context=context
            )
        
        # Channel type validation
        if context.channel_type == ChannelType.CATEGORY.value:
            return ValidationResult(
                should_process=False,
                reason="category_channel",
                context=context
            )
        
        # NSFW validation
        if context.is_nsfw and context.ignore_nsfw:
            return ValidationResult(
                should_process=False,
                reason="nsfw_ignored",
                context=context
            )
        
        return ValidationResult(
            should_process=True,
            context=context
        )
    
    async def _get_validation_context(
        self, 
        guild_id: str, 
        channel_id: str
    ) -> Optional[ValidationContext]:
        """
        Get validation context with Redis caching and hash-based invalidation.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
            
        Returns:
            ValidationContext or None if guild/channel not found
        """
        cache_key = f"validation:{guild_id}:{channel_id}"
        
        # Try Redis cache first (if available)
        if self.redis_client and self.redis_client.connected:
            try:
                cached_data = await self.redis_client.client.get(cache_key)
                if cached_data:
                    cached_context = ValidationContext.from_json(cached_data)
                    
                    # Check if hash is still valid
                    current_hash = await self._get_settings_hash(guild_id, channel_id)
                    if cached_context.settings_hash == current_hash:
                        logger.debug(f"Using cached validation context for {guild_id}:{channel_id}")
                        return cached_context
                    else:
                        logger.debug(f"Cache invalidated (hash mismatch) for {guild_id}:{channel_id}")
            except Exception as e:
                logger.warning(f"Redis cache read failed: {e}")
        
        # Cache miss or hash mismatch - build fresh context
        context = await self._build_validation_context(guild_id, channel_id)
        
        if context is None:
            return None
        
        # Cache in Redis (if available)
        if self.redis_client and self.redis_client.connected:
            try:
                await self.redis_client.client.setex(
                    cache_key,
                    self.cache_ttl,
                    context.to_json()
                )
                logger.debug(f"Cached validation context for {guild_id}:{channel_id}")
            except Exception as e:
                logger.warning(f"Redis cache write failed: {e}")
        
        return context
    
    async def _build_validation_context(
        self, 
        guild_id: str, 
        channel_id: str
    ) -> Optional[ValidationContext]:
        """
        Build validation context from database.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
            
        Returns:
            ValidationContext or None if guild/channel not found
        """
        # Fetch guild
        guild = await Guild.get_or_none(id=str(guild_id))
        if not guild:
            logger.debug(f"Guild {guild_id} not found in database")
            return None
        
        # Fetch channel
        channel = await Channel.get_or_none(id=str(channel_id))
        if not channel:
            logger.debug(f"Channel {channel_id} not found in database")
            return None
        
        # Get user settings for NSFW check
        ignore_nsfw = False
        settings_hash = ""
        try:
            user_settings, settings_hash = await resolve_user_settings(guild_id, channel_id)
            if user_settings:
                ignore_nsfw = user_settings.get('ignore_nsfw_channels', False)
        except Exception as e:
            logger.warning(f"Failed to resolve user settings: {e}")
        
        return ValidationContext(
            guild_id=guild_id,
            channel_id=channel_id,
            guild_enabled=guild.message_scan_enabled,
            channel_enabled=channel.message_scan_enabled,
            channel_type=channel.type.value if hasattr(channel.type, 'value') else str(channel.type),
            is_nsfw=channel.nsfw,
            ignore_nsfw=ignore_nsfw,
            settings_hash=settings_hash,
            cached_at=datetime.utcnow().isoformat()
        )
    
    async def _get_settings_hash(self, guild_id: str, channel_id: str) -> str:
        """
        Get current settings hash for cache invalidation.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
            
        Returns:
            Settings hash string
        """
        try:
            _, settings_hash = await resolve_user_settings(guild_id, channel_id)
            return settings_hash
        except Exception:
            return ""
    
    async def invalidate_cache(self, guild_id: str, channel_id: str) -> None:
        """
        Manually invalidate cached validation context.
        
        Args:
            guild_id: Discord guild snowflake
            channel_id: Discord channel snowflake
        """
        if self.redis_client and self.redis_client.connected:
            cache_key = f"validation:{guild_id}:{channel_id}"
            try:
                await self.redis_client.client.delete(cache_key)
                logger.debug(f"Invalidated validation cache for {guild_id}:{channel_id}")
            except Exception as e:
                logger.warning(f"Failed to invalidate cache: {e}")
