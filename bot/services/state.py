from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Set

from db.types import GuildSnapshot


@dataclass(slots=True)
class BotState:
    """Ephemeral runtime state for the Discord client."""

    available_guilds: Dict[str, GuildSnapshot] = field(default_factory=dict)
    # Lightweight, localized runtime status markers (e.g., "sync:guilds", "sync:channels")
    status_tags: Set[str] = field(default_factory=set)
