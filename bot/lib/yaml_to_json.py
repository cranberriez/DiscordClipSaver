from pathlib import Path
from typing import Any
import json
import yaml

def _load_yaml_source(yaml_source: str | Path) -> Any:
    """Load YAML content from a string or file path."""

    if isinstance(yaml_source, Path):
        text = yaml_source.read_text(encoding="utf-8")
        return yaml.safe_load(text) or {}

    if isinstance(yaml_source, str):
        candidate_path = Path(yaml_source)
        if candidate_path.exists():
            text = candidate_path.read_text(encoding="utf-8")
            return yaml.safe_load(text) or {}
        return yaml.safe_load(yaml_source) or {}

    raise TypeError(f"Unsupported YAML source type: {type(yaml_source)!r}")


def yaml_to_json(yaml_source: str | Path) -> str:
    """Convert YAML content to a JSON string using PyYAML."""

    payload = _load_yaml_source(yaml_source)
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
