from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return the current UTC datetime with tzinfo.

    Central helper to avoid naive datetimes. Prefer this over direct
    datetime.now() calls when writing timestamps to the database.
    """
    return datetime.now(timezone.utc)
