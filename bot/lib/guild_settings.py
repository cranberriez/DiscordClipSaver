
from __future__ import annotations

import json
from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
from typing import Any

import db.database as db
from db.types import GuildSettings
from logger import logger

from .yaml_to_json import yaml_to_json

def _as_mapping(record: Any) -> dict[str, Any]:
    if record is None:
        return {}
    if isinstance(record, Mapping):
        return dict(record)
    if hasattr(record, "_asdict"):
        return dict(record._asdict())  # type: ignore[attr-defined]
    if hasattr(record, "__dict__"):
        return dict(vars(record))
    return {}


async def get_guild_settings(guild_id: int) -> GuildSettings:
    guild_id_str = str(guild_id)

    try:
        record = db.get_guild_settings(guild_id_str)
    except Exception:  # pragma: no cover - defensive logging
        logger.exception("Failed fetching guild settings for guild %s", guild_id_str)
        raise

    if record is None:
        try:
            record = db.ensure_guild_settings(guild_id_str, defaults={})
        except Exception:  # pragma: no cover - defensive logging
            logger.exception("Failed ensuring default guild settings for guild %s", guild_id_str)
            raise

    data = _as_mapping(record)

    if not data:
        logger.warning("No guild settings found for guild %s; using defaults", guild_id_str)
        data = {
            "guild_id": guild_id_str,
            "settings": {},
            "updated_at": datetime.now(datetime.timezone.utc),
        }

    settings_value = data.get("settings") or {}
    if not isinstance(settings_value, dict):
        try:
            settings_value = dict(settings_value)
        except (TypeError, ValueError):
            logger.warning(
                "Unexpected settings payload for guild %s (%r); using empty defaults",
                guild_id_str,
                settings_value,
            )
            settings_value = {}

    updated_at = data.get("updated_at")
    if not isinstance(updated_at, datetime):
        logger.warning("Invalid updated_at for guild %s; using current time", guild_id_str)
        updated_at = datetime.now(datetime.timezone.utc)

    return GuildSettings(
        id=guild_id_str,
        settings=settings_value,
        updated_at=updated_at,
    )

def set_guild_settings_from_yaml(
    guild_id: str | int,
    yaml_source: str | Path,
    *,
    settings_key: str = "guild_settings_defaults",
) -> dict[str, Any]:
    """
    Update guild settings from YAML using the database `set_guild_settings` helper.

    Parameters
    ----------
    guild_id:
        Guild identifier (coerced to string) used for persistence.
    yaml_source:
        YAML content or path to a YAML file containing settings.
    settings_key:
        Optional top-level key to select from the YAML payload before persisting.
        Defaults to "guild_settings_defaults".

    Returns
    -------
    dict[str, Any]
        The settings dictionary that was persisted.
    """

    json_payload = yaml_to_json(yaml_source)
    data = json.loads(json_payload)

    if settings_key:
        if not isinstance(data, Mapping):
            raise ValueError("Expected top-level YAML payload to be a mapping when using settings_key.")
        try:
            data = data[settings_key]
        except KeyError as exc:
            raise KeyError(f"YAML payload missing key '{settings_key}'.") from exc

    if not isinstance(data, Mapping):
        raise ValueError("Guild settings payload must be a mapping/dictionary.")

    settings_dict: dict[str, Any] = dict(data)
    db.set_guild_settings(str(guild_id), settings_dict)
    return settings_dict
