"""Canonical, non-listable thumbnail object keys."""

import re
from typing import Literal

ThumbnailSize = Literal["small", "large"]

_SNOWFLAKE = re.compile(r"^[0-9]{1,64}$")
_CLIP_ID = re.compile(r"^[a-f0-9]{32}$", re.IGNORECASE)


def thumbnail_object_key(
    guild_id: str,
    channel_id: str,
    clip_id: str,
    size: ThumbnailSize,
) -> str:
    """Build the only supported v1 thumbnail object key."""
    if not _SNOWFLAKE.fullmatch(str(guild_id)):
        raise ValueError("Invalid guild ID")
    if not _SNOWFLAKE.fullmatch(str(channel_id)):
        raise ValueError("Invalid channel ID")
    if not _CLIP_ID.fullmatch(str(clip_id)):
        raise ValueError("Invalid clip ID")
    if size not in ("small", "large"):
        raise ValueError("Invalid thumbnail size")
    return f"thumbnails/v1/{guild_id}/{channel_id}/{clip_id}/{size}.webp"
