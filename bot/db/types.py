from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Tuple


@dataclass(slots=True)
class ChannelSnapshot:
    """Minimal representation of a Discord channel for persistence."""

    id: str
    name: str
    type: str


@dataclass(slots=True)
class GuildSnapshot:
    """Minimal representation of a Discord guild for persistence."""

    id: str
    name: str
    joined_at: datetime | None
    channels: Tuple[ChannelSnapshot, ...] = ()
