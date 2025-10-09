# TODO: Scheduled job to purge expired install intents
from __future__ import annotations

from typing import Any

from logger import logger
from db import database


async def purge_install_intents_job(grace_seconds: int = 300) -> None:
    """Delete expired install intents with a grace period for UI convenience."""
    try:
        deleted = await database.purge_expired_install_intents(grace_seconds=grace_seconds)
        if deleted:
            logger.info("purge_install_intents: deleted=%d grace_seconds=%d", deleted, grace_seconds)
        else:
            logger.debug("purge_install_intents: no rows to delete (grace_seconds=%d)", grace_seconds)
    except Exception as e:
        logger.exception("purge_install_intents failed: %s", e)


def schedule_purge_install_intents(scheduler: Any, cron_expr: str, grace_seconds: int = 300) -> None:
    """Register the purge job on the given APScheduler scheduler.

    - cron_expr: standard 5-field crontab expression (min hour day month weekday)
    - grace_seconds: deletion grace window in seconds (default 300s)
    """
    from apscheduler.triggers.cron import CronTrigger

    trigger = CronTrigger.from_crontab(cron_expr)
    scheduler.add_job(
        purge_install_intents_job,
        trigger=trigger,
        id="purge_install_intents",
        replace_existing=True,
        kwargs={"grace_seconds": grace_seconds},
        coalesce=True,
        max_instances=1,
    )