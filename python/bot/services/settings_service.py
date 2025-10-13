from __future__ import annotations

from pathlib import Path
from typing import Any
import os

from bot.lib.jsonc_loader import load_jsonc


class SettingsService:
    """
    Single source of truth for application config and default guild/channel settings,
    loaded from settings.default.jsonc (or an override path via env).
    """

    def __init__(self, jsonc_source: str | Path | None = None) -> None:
        if jsonc_source is None:
            override = os.getenv("DEFAULT_SETTINGS_PATH")
            if override:
                jsonc_source = Path(os.path.expanduser(os.path.expandvars(override)))
            else:
                # bot/services/settings_service.py -> project_root/settings.default.jsonc
                repo_root = Path(__file__).resolve().parents[3]
                jsonc_source = repo_root / "settings.default.jsonc"
        self._jsonc_source: str | Path = jsonc_source
        self._config: dict[str, Any] = {}
        self.reload_config()

    def reload_config(self, jsonc_source: str | Path | None = None) -> None:
        if jsonc_source is not None:
            self._jsonc_source = jsonc_source
        data = load_jsonc(self._jsonc_source)
        if not isinstance(data, dict):
            raise ValueError("Top-level JSON must be a mapping/dictionary.")
        self._config = data

    def get_config(self, *keys: str, default: Any = ...) -> Any:
        """Nested lookup into the loaded JSON config.

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