from __future__ import annotations

import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from lib.global_config import globalConfig
from .purge_intents import schedule_purge_install_intents


def start_scheduler_and_jobs() -> AsyncIOScheduler:
    """Create and start a single scheduler, and register all jobs here.

    Returns the started scheduler instance.
    """
    # Configure jobs from environment
    purge_cron = globalConfig.get("database_settings_defaults", "install_intent_purge_cron")
    grace = globalConfig.get("database_settings_defaults", "install_intent_purge_grace_seconds")

    scheduler = AsyncIOScheduler()

    # Register all jobs here
    schedule_purge_install_intents(scheduler, purge_cron, grace_seconds=grace)

    scheduler.start()
    return scheduler
