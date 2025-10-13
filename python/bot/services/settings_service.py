from __future__ import annotations

from pathlib import Path
from typing import Any
import os
import json

from bot.lib.yaml_to_json import yaml_to_json


class SettingsService:
    """
    Single source of truth for application config and default guild/channel settings,
    loaded from settings.default.yml (or an override path via env).
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