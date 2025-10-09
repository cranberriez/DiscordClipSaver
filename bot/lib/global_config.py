from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .yaml_to_json import yaml_to_json


class GlobalConfig:
    """
    Lazy-loaded global configuration built from a YAML source.

    Defaults to the repository's `settings.default.yml` located at the project root.

    Usage examples:
        globalConfig.get()  # full mapping (dict)
        globalConfig.get("database_settings_defaults")  # sub-mapping
        globalConfig.get("database_settings_defaults", "install_intent_expire_time")  # nested value
        globalConfig.get("missing", default=None)  # fallback if missing
        globalConfig.as_json()  # JSON string of the full config
    """

    def __init__(self, yaml_source: str | Path | None = None) -> None:
        if yaml_source is None:
            # bot/lib/global_config.py -> project_root/settings.default.yml
            repo_root = Path(__file__).resolve().parents[2]
            yaml_source = repo_root / "settings.default.yml"

        self._yaml_source: Path | str = yaml_source
        self._data: dict[str, Any] = {}
        self.reload()

    @property
    def source(self) -> str:
        return str(self._yaml_source)

    def _load(self) -> dict[str, Any]:
        payload_json = yaml_to_json(self._yaml_source)
        data = json.loads(payload_json) or {}
        if not isinstance(data, dict):
            raise ValueError("Top-level YAML must be a mapping/dictionary.")
        return data

    def reload(self, yaml_source: str | Path | None = None) -> None:
        """Reload configuration from YAML, optionally changing the source."""
        if yaml_source is not None:
            self._yaml_source = yaml_source
        self._data = self._load()

    def get(self, *keys: str, default: Any = ... ) -> Any:
        """
        Get a nested value by key path.

        - No keys: returns the entire config mapping
        - One key: returns the sub-mapping or value at that key
        - Multiple keys: traverses nested dicts
        - If a path segment is missing and `default` is provided, returns `default`
          otherwise raises KeyError.
        """
        if len(keys) == 0:
            return self._data

        node: Any = self._data
        for key in keys:
            if not isinstance(node, dict):
                if default is not ...:
                    return default
                raise KeyError(".".join(keys))
            if key in node:
                node = node[key]
            else:
                if default is not ...:
                    return default
                raise KeyError(".".join(keys))
        return node

    def as_json(self) -> str:
        """Return the full configuration as a compact JSON string."""
        return json.dumps(self._data, ensure_ascii=False, separators=(",", ":"))


# Singleton instance for convenient imports/usage
globalConfig = GlobalConfig()
