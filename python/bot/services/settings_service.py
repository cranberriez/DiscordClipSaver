from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable
import os
import json

import db.database as db
from db.types import GuildSettings
from logger import logger
from lib.yaml_to_json import yaml_to_json


class SettingsService:
    """
    Single source of truth for application config and default guild/channel settings,
    loaded from settings.default.yml (or an override path via env).

    Also provides guild settings accessors via the async DB facade.
    """

    def __init__(self, yaml_source: str | Path | None = None) -> None:
        if yaml_source is None:
            override = os.getenv("DEFAULT_SETTINGS_PATH")
            if override:
                yaml_source = Path(os.path.expanduser(os.path.expandvars(override)))
            else:
                # bot/services/settings_service.py -> project_root/settings.default.yml
                repo_root = Path(__file__).resolve().parents[3]
                yaml_source = repo_root / "settings.default.yml"
        self._yaml_source: str | Path = yaml_source
        self._config: dict[str, Any] = {}
        self.reload_config()

    def reload_config(self, yaml_source: str | Path | None = None) -> None:
        if yaml_source is not None:
            self._yaml_source = yaml_source
        payload_json = yaml_to_json(self._yaml_source)
        data = json.loads(payload_json) or {}
        if not isinstance(data, dict):
            raise ValueError("Top-level YAML must be a mapping/dictionary.")
        self._config = data

    def get_config(self, *keys: str, default: Any = ...) -> Any:
        """Nested lookup into the loaded YAML config.

        - No keys: return the entire config mapping.
        - With keys: traverse nested dicts; if missing and `default` provided, return it, else KeyError.
        """
        if len(keys) == 0:
            return self._config
        node: Any = self._config
        for key in keys:
            if not isinstance(node, dict) or key not in node:
                if default is not ...:
                    return default
                raise KeyError(".".join(keys))
            node = node[key]
        return node

    async def get_guild_settings(self, guild_id: str) -> GuildSettings:
        return await db.get_guild_settings(str(guild_id))  # type: ignore[return-value]

    async def set_guild_settings_from_yaml(
        self,
        guild_id: str,
        yaml_source: str | Path | None = None,
        *,
        settings_key: str = "guild_settings_defaults",
    ) -> dict[str, Any]:
        """Persist guild settings from a YAML source or from the loaded config."""
        if yaml_source is None:
            data: Any = self.get_config(settings_key, default={})
        else:
            data = json.loads(yaml_to_json(yaml_source))
            if settings_key:
                if not isinstance(data, dict):
                    raise ValueError("Expected top-level YAML payload to be a mapping when using settings_key.")
                try:
                    data = data[settings_key]
                except KeyError as exc:
                    raise KeyError(f"YAML payload missing key '{settings_key}'.") from exc
        if not isinstance(data, dict):
            raise ValueError("Guild settings payload must be a mapping/dictionary.")
        settings_dict: dict[str, Any] = dict(data)
        await db.set_guild_settings(str(guild_id), settings_dict)
        return settings_dict

    async def ensure_defaults_for_guilds(self, guild_ids: Iterable[str]) -> None:
        """Apply default settings for guilds that lack stored settings.

        Uses DEFAULT_SETTINGS_PATH if set, else the loaded config cache.
        """
        override_path = os.getenv("DEFAULT_SETTINGS_PATH")
        yaml_source: str | Path | None = Path(override_path) if override_path else None

        for gid in guild_ids:
            record = await db.get_guild_settings(gid)
            if record is None:
                record = await db.ensure_guild_settings(gid, defaults={})

            settings_payload: Any = None
            if isinstance(record, dict):
                settings_payload = record.get("settings")
            elif hasattr(record, "_asdict"):
                settings_payload = record._asdict().get("settings")  # type: ignore[attr-defined]
            elif isinstance(record, tuple) and len(record) >= 2:
                settings_payload = record[1]
            else:
                settings_payload = getattr(record, "settings", None)

            if isinstance(settings_payload, dict) and settings_payload:
                continue
            if settings_payload and not isinstance(settings_payload, dict):
                logger.debug(
                    "Skipping default settings for guild %s because existing payload is non-mapping (%r)",
                    gid,
                    type(settings_payload),
                )
                continue

            try:
                await self.set_guild_settings_from_yaml(gid, yaml_source)
                logger.info("Applied default guild settings for guild %s", gid)
            except Exception:
                logger.exception("Failed to apply default guild settings for guild %s", gid)
