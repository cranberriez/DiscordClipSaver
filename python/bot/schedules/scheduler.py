from __future__ import annotations

import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bot.schedules.purge_intents import schedule_purge_install_intents
from bot.services.container import settings_service


def start_scheduler_and_jobs() -> AsyncIOScheduler:
    """Create and start a single scheduler, and register all jobs here.

    Returns the started scheduler instance.
    """
    # Configure jobs from environment
    purge_cron = settings_service.get_config("database_settings_defaults", "install_intent_purge_cron", default="*/30 * * * *")
    grace = settings_service.get_config("database_settings_defaults", "install_intent_purge_grace_seconds", default=360)

    scheduler = AsyncIOScheduler()

    # Register all jobs here
    schedule_purge_install_intents(scheduler, purge_cron, grace_seconds=grace)

    scheduler.start()
    return scheduler
