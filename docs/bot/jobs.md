# Scheduled Jobs Documentation

## Overview

The bot uses APScheduler to run periodic background tasks.

## Scheduler

**File**: `jobs/scheduler.py`

Creates and starts the scheduler with all registered jobs.

**Configuration:**
- `database_settings_defaults.install_intent_purge_cron` - Cron expression for job schedule
- `database_settings_defaults.install_intent_purge_grace_seconds` - Grace period in seconds

## Jobs

### Purge Install Intents Job

**File**: `jobs/purge_intents.py`

Periodically removes expired OAuth install intents from the database.

#### Purpose
Cleans up temporary OAuth records after expiration to prevent database bloat.

#### Configuration
- **Schedule**: Every 30 minutes (default: `*/30 * * * *`)
- **Grace Period**: 360 seconds (6 minutes)
- **Max Instances**: 1 (prevents concurrent runs)

#### Behavior
1. Queries for expired install intents
2. Deletes records older than `expires_at - grace_seconds`
3. Logs deletion count or debug message if none

## Adding New Jobs

1. Create job module in `jobs/` directory
2. Define async job function
3. Create schedule function
4. Register in `scheduler.py`
5. Add configuration to `settings.default.yml`
