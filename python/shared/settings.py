"""
Simple settings access class for bot and worker processes.

This provides a clean interface to access static settings loaded from the
settings file. These settings are loaded once at startup and never change.
"""

from typing import List, Optional, Any
from shared.settings_loader import get_server_admin_guild_defaults, get_server_admin_channel_defaults, get_worker_defaults


class BotSettings:
    """
    Simple access to bot/system settings loaded from settings file.
    
    This replaces the complex database-based settings resolution with
    direct access to static configuration values.
    """
    
    @staticmethod
    def get_guild_enabled_by_default() -> bool:
        """Whether new channels should be enabled by default."""
        return get_server_admin_guild_defaults().get("enabled_by_default", False)
    
    @staticmethod
    def get_parse_threads() -> bool:
        """Whether to parse thread messages."""
        return get_server_admin_guild_defaults().get("parse_threads", False)
    
    @staticmethod
    def get_guild_timezone() -> str:
        """Guild timezone context."""
        return get_server_admin_guild_defaults().get("tz", "UTC")
    
    @staticmethod
    def get_schedule_cron() -> str:
        """Default job scheduling cron expression."""
        return get_server_admin_guild_defaults().get("schedule_cron", "@continuous")
    
    @staticmethod
    def get_channel_enabled_default() -> bool:
        """Whether channels default to enabled when found."""
        return get_server_admin_channel_defaults().get("is_enabled", True)
    
    @staticmethod
    def get_scan_mode() -> str:
        """Default scan mode (forward/backfill)."""
        return get_server_admin_channel_defaults().get("scan_mode", "forward")
    
    @staticmethod
    def get_max_messages_per_pass() -> int:
        """Maximum messages to process per scan pass."""
        return get_server_admin_channel_defaults().get("max_messages_per_pass", 1000)
    
    @staticmethod
    def get_debounce_ms() -> int:
        """Debounce time for hot channels in milliseconds."""
        return get_server_admin_channel_defaults().get("debounce_ms", 250)
    
    @staticmethod
    def get_include_threads() -> bool:
        """Whether to include threads in scanning."""
        return get_server_admin_channel_defaults().get("include_threads", False)
    
    @staticmethod
    def get_accept_video() -> bool:
        """Whether to accept video attachments."""
        return get_server_admin_channel_defaults().get("accept_video", True)
    
    @staticmethod
    def get_min_video_seconds() -> float:
        """Minimum video length in seconds."""
        return get_server_admin_channel_defaults().get("min_video_seconds", 0)
    
    @staticmethod
    def get_mime_allowlist() -> List[str]:
        """List of allowed MIME types for video attachments."""
        return get_server_admin_channel_defaults().get("mime_allowlist", [
            "video/mp4", 
            "video/quicktime", 
            "video/webm"
        ])
    
    @staticmethod
    def get_text_include_regex() -> Optional[str]:
        """Regex pattern for including messages based on content."""
        return get_server_admin_channel_defaults().get("text_include_regex", None)
    
    @staticmethod
    def get_text_exclude_regex() -> Optional[str]:
        """Regex pattern for excluding messages based on content."""
        return get_server_admin_channel_defaults().get("text_exclude_regex", None)
    
    @staticmethod
    def get_all_channel_settings() -> dict:
        """Get all channel settings as a dictionary."""
        return get_server_admin_channel_defaults()
    
    @staticmethod
    def get_all_guild_settings() -> dict:
        """Get all guild settings as a dictionary."""
        return get_server_admin_guild_defaults()
    
    # =========================
    # WORKER SETTINGS
    # =========================
    
    @staticmethod
    def get_default_batch_limit() -> int:
        """Default number of messages to process per batch."""
        return get_worker_defaults().get("default_batch_limit", 100)
    
    @staticmethod
    def get_default_scan_direction() -> str:
        """Default scanning direction."""
        return get_worker_defaults().get("default_scan_direction", "backward")
    
    @staticmethod
    def get_job_batch_size() -> int:
        """Number of jobs to process at once."""
        return get_worker_defaults().get("job_batch_size", 10)
    
    @staticmethod
    def get_redis_block_timeout_ms() -> int:
        """Redis blocking timeout in milliseconds."""
        return get_worker_defaults().get("redis_block_timeout_ms", 5000)
    
    @staticmethod
    def get_bot_ready_timeout_seconds() -> float:
        """Timeout waiting for Discord bot to come online."""
        return get_worker_defaults().get("bot_ready_timeout_seconds", 30.0)
    
    @staticmethod
    def get_thumbnail_timestamp_seconds() -> float:
        """Default timestamp to extract thumbnail from."""
        return get_worker_defaults().get("thumbnail_timestamp_seconds", 1.0)
    
    @staticmethod
    def get_video_download_timeout_seconds() -> int:
        """Total download timeout in seconds."""
        return get_worker_defaults().get("video_download_timeout_seconds", 300)
    
    @staticmethod
    def get_video_download_connect_timeout_seconds() -> int:
        """Connection timeout in seconds."""
        return get_worker_defaults().get("video_download_connect_timeout_seconds", 10)
    
    @staticmethod
    def get_thumbnail_retry_backoff_minutes() -> List[int]:
        """Exponential backoff schedule for thumbnail retries."""
        return get_worker_defaults().get("thumbnail_retry_backoff_minutes", [5, 15, 60, 240, 720, 1440])
    
    @staticmethod
    def get_thumbnail_retry_batch_limit() -> int:
        """Max thumbnails to retry at once."""
        return get_worker_defaults().get("thumbnail_retry_batch_limit", 10)
    
    @staticmethod
    def get_thumbnail_stale_timeout_minutes() -> int:
        """When to consider thumbnail generation stale."""
        return get_worker_defaults().get("thumbnail_stale_timeout_minutes", 30)
    
    @staticmethod
    def get_stale_scan_cleanup_interval_seconds() -> int:
        """How often to check for stale scans."""
        return get_worker_defaults().get("stale_scan_cleanup_interval_seconds", 300)
    
    @staticmethod
    def get_stale_scan_timeout_minutes() -> int:
        """When to consider a scan stale."""
        return get_worker_defaults().get("stale_scan_timeout_minutes", 30)
    
    @staticmethod
    def get_stale_thumbnail_cleanup_interval_seconds() -> int:
        """How often to check for stale thumbnails."""
        return get_worker_defaults().get("stale_thumbnail_cleanup_interval_seconds", 3600)
    
    @staticmethod
    def get_stale_thumbnail_timeout_minutes() -> int:
        """When to consider thumbnail generation stale for cleanup."""
        return get_worker_defaults().get("stale_thumbnail_timeout_minutes", 60)
    
    @staticmethod
    def get_db_health_check_interval_seconds() -> int:
        """Database health check interval."""
        return get_worker_defaults().get("db_health_check_interval_seconds", 60)
    
    @staticmethod
    def get_video_extensions() -> List[str]:
        """List of supported video file extensions."""
        return get_channel_defaults().get("video_extensions", [".mp4", ".mov", ".webm", ".avi", ".mkv", ".flv", ".wmv", ".m4v"])
    
    @staticmethod
    def get_all_worker_settings() -> dict:
        """Get all worker settings as a dictionary."""
        return get_worker_defaults()


# Convenience instance for easier imports
settings = BotSettings()
