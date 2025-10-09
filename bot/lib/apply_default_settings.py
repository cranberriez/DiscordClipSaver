from __future__ import annotations

import os
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

import db.database as db
from db.types import GuildSnapshot
from logger import logger
from .guild_settings import set_guild_settings_from_yaml


def _extract_settings_field(record: Any) -> Any:
    if record is None:
        return None
    if isinstance(record, Mapping):
        return record.get("settings")
    if hasattr(record, "_asdict"):
        return record._asdict().get("settings")
    if isinstance(record, tuple) and len(record) >= 2:
        return record[1]
    return getattr(record, "settings", None)


async def apply_default_settings_for_guilds(guild_snapshots: Iterable[GuildSnapshot]) -> None:
    """Apply default guild settings for guilds lacking stored settings."""

    default_settings_path = os.getenv("DEFAULT_SETTINGS_PATH")
    if not default_settings_path:
        logger.info("DEFAULT_SETTINGS_PATH not set; skipping default guild settings import.")
        return

    settings_path = Path(default_settings_path)
    if not settings_path.exists():
        logger.warning("Default settings file not found at %s; skipping import.", settings_path)
        return

    for snapshot in guild_snapshots:
        guild_id = str(snapshot.id)
        existing_record = await db.get_guild_settings(guild_id)
        if existing_record is None:
            existing_record = await db.ensure_guild_settings(guild_id, defaults={})

        existing_settings = _extract_settings_field(existing_record)
        if isinstance(existing_settings, Mapping) and existing_settings:
            continue
        if existing_settings and not isinstance(existing_settings, Mapping):
            logger.debug(
                "Skipping default settings for guild %s because existing payload is non-mapping (%r)",
                guild_id,
                type(existing_settings),
            )
            continue

        try:
            await set_guild_settings_from_yaml(guild_id, settings_path)
            logger.info(
                "Applied default guild settings for guild %s using %s",
                guild_id,
                settings_path,
            )
        except Exception:  # pragma: no cover - defensive logging
            logger.exception(
                "Failed to apply default guild settings for guild %s using %s",
                guild_id,
                settings_path,
            )

