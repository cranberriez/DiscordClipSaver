"""
Centralized settings loader for bot and worker processes.

This module provides a simple, performant way to access bot/system settings
that are loaded once from the settings file at startup. These settings are
static and never change during runtime, eliminating the need for database
queries or complex caching.

Usage:
    from shared.settings_loader import get_guild_defaults, get_channel_defaults
    
    guild_settings = get_guild_defaults()
    channel_settings = get_channel_defaults()
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from bot.lib.jsonc_loader import load_jsonc


class SettingsLoader:
    """
    Centralized settings loader that loads configuration once at startup.
    
    This replaces the complex database-based settings resolution with a simple
    file-based approach for bot/system settings that don't change during runtime.
    """
    
    def __init__(self, settings_path: Optional[str] = None):
        self._guild_defaults: Dict[str, Any] = {}
        self._channel_defaults: Dict[str, Any] = {}
        self._database_defaults: Dict[str, Any] = {}
        self._worker_defaults: Dict[str, Any] = {}
        self._user_facing_defaults: Dict[str, Any] = {}
        self._loaded = False
        
        if settings_path:
            self.load_settings(settings_path)
        else:
            self._auto_load_settings()
    
    def _auto_load_settings(self) -> None:
        """Auto-detect and load settings file."""
        # Check environment variable first
        override_path = os.getenv("DEFAULT_SETTINGS_PATH")
        if override_path:
            settings_path = Path(os.path.expanduser(os.path.expandvars(override_path)))
        else:
            # Default to project root settings file
            # shared/settings_loader.py -> project_root/settings.default.jsonc
            repo_root = Path(__file__).resolve().parents[2]
            settings_path = repo_root / "settings.default.jsonc"
        
        self.load_settings(str(settings_path))
    
    def load_settings(self, settings_path: str) -> None:
        """Load settings from the specified file."""
        try:
            config = load_jsonc(settings_path)
            
            if not isinstance(config, dict):
                raise ValueError("Settings file must contain a JSON object")
            
            # Extract each settings section
            self._guild_defaults = config.get("guild_settings_defaults", {})
            self._channel_defaults = config.get("channel_settings_defaults", {})
            self._database_defaults = config.get("database_settings_defaults", {})
            self._worker_defaults = config.get("worker_settings_defaults", {})
            self._user_facing_defaults = config.get("user_facing_settings_defaults", {})
            
            self._loaded = True
            
        except Exception as e:
            raise RuntimeError(f"Failed to load settings from {settings_path}: {e}")
    
    def get_guild_defaults(self) -> Dict[str, Any]:
        """Get guild-level default settings."""
        if not self._loaded:
            raise RuntimeError("Settings not loaded. Call load_settings() first.")
        return self._guild_defaults.copy()
    
    def get_channel_defaults(self) -> Dict[str, Any]:
        """Get channel-level default settings."""
        if not self._loaded:
            raise RuntimeError("Settings not loaded. Call load_settings() first.")
        return self._channel_defaults.copy()
    
    def get_database_defaults(self) -> Dict[str, Any]:
        """Get database-level default settings."""
        if not self._loaded:
            raise RuntimeError("Settings not loaded. Call load_settings() first.")
        return self._database_defaults.copy()
    
    def get_worker_defaults(self) -> Dict[str, Any]:
        """Get worker-level default settings."""
        if not self._loaded:
            raise RuntimeError("Settings not loaded. Call load_settings() first.")
        return self._worker_defaults.copy()
    
    def get_user_facing_defaults(self) -> Dict[str, Any]:
        """Get user-facing default settings."""
        if not self._loaded:
            raise RuntimeError("Settings not loaded. Call load_settings() first.")
        return self._user_facing_defaults.copy()
    
    def get_guild_setting(self, key: str, default: Any = None) -> Any:
        """Get a specific guild setting."""
        return self.get_guild_defaults().get(key, default)
    
    def get_channel_setting(self, key: str, default: Any = None) -> Any:
        """Get a specific channel setting."""
        return self.get_channel_defaults().get(key, default)
    
    def get_database_setting(self, key: str, default: Any = None) -> Any:
        """Get a specific database setting."""
        return self.get_database_defaults().get(key, default)
    
    def get_worker_setting(self, key: str, default: Any = None) -> Any:
        """Get a specific worker setting."""
        return self.get_worker_defaults().get(key, default)
    
    def get_user_facing_setting(self, key: str, default: Any = None) -> Any:
        """Get a specific user-facing setting."""
        return self.get_user_facing_defaults().get(key, default)
    
    def is_loaded(self) -> bool:
        """Check if settings have been loaded."""
        return self._loaded


# Global settings loader instance
_settings_loader: Optional[SettingsLoader] = None


def initialize_settings(settings_path: Optional[str] = None) -> None:
    """
    Initialize the global settings loader.
    
    This should be called once at application startup.
    
    Args:
        settings_path: Optional path to settings file. If not provided,
                      will auto-detect from environment or use default.
    """
    global _settings_loader
    _settings_loader = SettingsLoader(settings_path)


def get_settings_loader() -> SettingsLoader:
    """
    Get the global settings loader instance.
    
    Raises:
        RuntimeError: If settings haven't been initialized yet.
    """
    if _settings_loader is None:
        raise RuntimeError(
            "Settings not initialized. Call initialize_settings() first."
        )
    return _settings_loader


# Convenience functions for common access patterns
def get_guild_defaults() -> Dict[str, Any]:
    """Get guild-level default settings."""
    return get_settings_loader().get_guild_defaults()


def get_channel_defaults() -> Dict[str, Any]:
    """Get channel-level default settings."""
    return get_settings_loader().get_channel_defaults()


def get_database_defaults() -> Dict[str, Any]:
    """Get database-level default settings."""
    return get_settings_loader().get_database_defaults()


def get_worker_defaults() -> Dict[str, Any]:
    """Get worker-level default settings."""
    return get_settings_loader().get_worker_defaults()


def get_user_facing_defaults() -> Dict[str, Any]:
    """Get user-facing default settings."""
    return get_settings_loader().get_user_facing_defaults()


def get_guild_setting(key: str, default: Any = None) -> Any:
    """Get a specific guild setting."""
    return get_settings_loader().get_guild_setting(key, default)


def get_channel_setting(key: str, default: Any = None) -> Any:
    """Get a specific channel setting."""
    return get_settings_loader().get_channel_setting(key, default)


def get_database_setting(key: str, default: Any = None) -> Any:
    """Get a specific database setting."""
    return get_settings_loader().get_database_setting(key, default)


def get_worker_setting(key: str, default: Any = None) -> Any:
    """Get a specific worker setting."""
    return get_settings_loader().get_worker_setting(key, default)


def get_user_facing_setting(key: str, default: Any = None) -> Any:
    """Get a specific user-facing setting."""
    return get_settings_loader().get_user_facing_setting(key, default)
