from __future__ import annotations

from pathlib import Path
from typing import Any
import json
import re

_COMMENTS_PATTERN = re.compile(
    r"""
    (?P<string>"(?:\\.|[^"\\])*")
    |(?P<comment>//[^\n\r]*|/\*.*?\*/)
    """,
    re.VERBOSE | re.DOTALL,
)


def _strip_jsonc_comments(text: str) -> str:
    """Remove line and block comments from JSONC content."""

    def _replacer(match: re.Match[str]) -> str:
        if match.group("string") is not None:
            return match.group("string")
        return ""

    return _COMMENTS_PATTERN.sub(_replacer, text)


def _read_jsonc_source(jsonc_source: str | Path) -> str:
    """Load JSONC text from a string or file path."""

    if isinstance(jsonc_source, Path):
        return jsonc_source.read_text(encoding="utf-8")

    if isinstance(jsonc_source, str):
        candidate_path = Path(jsonc_source)
        if candidate_path.exists():
            return candidate_path.read_text(encoding="utf-8")
        return jsonc_source

    raise TypeError(f"Unsupported JSONC source type: {type(jsonc_source)!r}")


def load_jsonc(jsonc_source: str | Path) -> dict[str, Any]:
    """Parse JSONC content and return the resulting mapping."""

    text = _read_jsonc_source(jsonc_source)
    cleaned = _strip_jsonc_comments(text)
    data = json.loads(cleaned) or {}
    if not isinstance(data, dict):
        raise ValueError("Top-level JSON must be a mapping/dictionary.")
    return data
