from __future__ import annotations

from datetime import datetime, timedelta, timezone

from shared.db.models import InstallIntent


async def purge_expired_install_intents(grace_seconds: int = 300) -> int:
    """Delete install intents whose expires_at is older than now - grace_seconds.

    Returns the number of rows deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=grace_seconds)
    return await InstallIntent.filter(expires_at__lt=cutoff).delete()
