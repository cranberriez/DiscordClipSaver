from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Tuple, Optional, Dict, Any


@dataclass(slots=True)
class ChannelSnapshot:
    """Minimal representation of a Discord channel for persistence."""

    id: str
    name: str
    type: str
    is_nsfw: bool = False
    # Channel-specific settings overrides (partial). Merged into defaults server-side.
    settings_overrides: Optional[Dict[str, Any]] = None


@dataclass(slots=True)
class GuildSnapshot:
    """Minimal representation of a Discord guild for persistence."""

    id: str
    name: str
    icon: str | None = None
    owner_user_id: str | None = None
    joined_at: datetime | None = None
    channels: Tuple[ChannelSnapshot, ...] = ()
