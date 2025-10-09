from __future__ import annotations

import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .purge_intents import schedule_purge_install_intents


def start_scheduler_and_jobs() -> AsyncIOScheduler:
    """Create and start a single scheduler, and register all jobs here.

    Returns the started scheduler instance.
    """
    # Configure jobs from environment
    purge_cron = os.getenv("PURGE_INTENTS_CRON", "* * * * *")  # default: every minute
    grace = int(os.getenv("PURGE_INTENTS_GRACE_SECONDS", "300"))

    scheduler = AsyncIOScheduler()

    # Register all jobs here
    schedule_purge_install_intents(scheduler, purge_cron, grace_seconds=grace)

    scheduler.start()
    return scheduler
