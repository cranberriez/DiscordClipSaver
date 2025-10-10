# Operational Guide

## Deployment

### Prerequisites

#### System Requirements
- **OS**: Linux (recommended), Windows, macOS
- **Python**: 3.10 or higher
- **PostgreSQL**: 12 or higher
- **Memory**: 512MB minimum, 2GB recommended
- **Disk**: 10GB minimum for database growth

#### Required Accounts
- Discord Developer Account with bot created
- PostgreSQL database instance
- (Optional) Cloud hosting account

### Installation Steps

#### 1. Clone Repository
```bash
git clone <repository-url>
cd DiscordClipSaver
```

#### 2. Install Dependencies
```bash
cd bot
pip install -r requirements.txt

# Or use virtual environment (recommended)
python -m venv env
source env/bin/activate  # Linux/macOS
# env\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### 3. Configure Environment
Create `bot/.env` file:
```env
# Discord Configuration
BOT_TOKEN=your_discord_bot_token_here

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=discord_bot
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=discord_clip_saver

# Optional: Use full DSN instead
# DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional: Custom settings path
# DEFAULT_SETTINGS_PATH=/path/to/settings.yml
```

#### 4. Setup Database
```bash
# Create database user
sudo -u postgres psql
CREATE USER discord_bot WITH PASSWORD 'secure_password_here';
CREATE DATABASE discord_clip_saver OWNER discord_bot;
GRANT ALL PRIVILEGES ON DATABASE discord_clip_saver TO discord_bot;
\q

# Tables are created automatically on first run
```

#### 5. Configure Settings
Edit `settings.default.yml` in project root:
```yaml
guild_settings_defaults:
  # Add your default guild settings
  prefix: "!"
  auto_scan: true
  
database_settings_defaults:
  install_intent_purge_cron: "*/30 * * * *"
  install_intent_purge_grace_seconds: 360
```

#### 6. Start Bot
```bash
cd bot
python main.py
```

Expected output:
```
INFO discord_clip_saver - Bot starting...
INFO discord.client - Logging in using static token
INFO discord.gateway - Connected to Gateway
INFO discord_clip_saver - Accessible guilds: Guild1, Guild2
INFO uvicorn - Started server process
INFO uvicorn - Uvicorn running on http://0.0.0.0:8000
```

### Docker Deployment

#### Build Image
```bash
cd bot
docker build -t discord-clip-saver:latest .
```

#### Run Container
```bash
docker run -d \
  --name discord-bot \
  --env-file .env \
  -p 8000:8000 \
  --restart unless-stopped \
  discord-clip-saver:latest
```

#### Docker Compose
See `docker-compose.yml` in project root.

```bash
docker-compose up -d
```

## Configuration Management

### Environment Variables

#### Required Variables
- `BOT_TOKEN`: Discord bot token (critical - never commit)
- Database connection vars (see installation)

#### Optional Variables
- `DEFAULT_SETTINGS_PATH`: Override default settings file
- `LOG_LEVEL`: Override logging level (default: INFO)

### Settings File

#### Location
Default: `settings.default.yml` in project root

#### Structure
```yaml
# Guild-level defaults
guild_settings_defaults:
  prefix: "!"
  auto_scan: true
  scan_nsfw: false
  max_file_size_mb: 100

# Database job configuration  
database_settings_defaults:
  install_intent_purge_cron: "*/30 * * * *"
  install_intent_purge_grace_seconds: 360

# Future: Add more configuration sections as needed
```

#### Updating Settings
1. Edit `settings.default.yml`
2. Restart bot to apply changes
3. Existing guilds retain their settings
4. New guilds get updated defaults

### Per-Guild Settings

Settings are stored in database `guild_settings` table.

#### View Settings
```sql
SELECT guild_id, settings FROM guild_settings WHERE guild_id = '123456789';
```

#### Update Settings
```sql
-- Merge update (add/modify keys)
UPDATE guild_settings 
SET settings = settings || '{"new_key": "value"}'::jsonb
WHERE guild_id = '123456789';

-- Full replacement
UPDATE guild_settings 
SET settings = '{"prefix": "!", "auto_scan": false}'::jsonb
WHERE guild_id = '123456789';
```

## Monitoring

### Health Checks

#### API Health Endpoint
```bash
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

#### Database Connectivity
```sql
-- Check connection
SELECT 1;

-- Check bot_guilds table
SELECT COUNT(*) FROM bot_guilds;
```

#### Bot Status
Check logs for:
- `INFO discord.gateway - Connected to Gateway`
- Guild sync messages
- Error messages

### Logging

#### Log Levels
- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARNING**: Warning messages (e.g., missing permissions)
- **ERROR**: Error messages (recoverable)
- **CRITICAL**: Critical errors (bot shutdown required)

#### Log Location
- Default: stdout (console)
- Docker: Use `docker logs discord-bot`
- Production: Configure log aggregation (e.g., ELK stack)

#### Key Log Messages

**Normal Operation:**
```
INFO discord_clip_saver - Accessible guilds: MyGuild
INFO discord_clip_saver - Applied default guild settings for guild 123
INFO discord_clip_saver - purge_install_intents: deleted=5 grace_seconds=360
```

**Warnings:**
```
WARNING discord - Missing permissions for channel 456
WARNING discord_clip_saver - Skipping default settings for guild 123
```

**Errors:**
```
ERROR discord_clip_saver - Failed to sync guild 123: ...
ERROR psycopg - Connection lost
CRITICAL discord_clip_saver - Invalid bot token
```

### Metrics to Monitor

#### Application Metrics
- Bot uptime
- Number of guilds tracked
- Number of channels tracked
- Active scan runs
- API response times

#### Database Metrics
- Connection count
- Query performance
- Table sizes
- Index usage
- Slow queries

#### System Metrics
- Memory usage
- CPU usage
- Disk usage
- Network I/O

### Alerting

#### Critical Alerts
- Bot disconnected from Discord
- Database connection lost
- Repeated authentication failures
- Out of memory errors

#### Warning Alerts
- High error rate
- Slow database queries
- Disk space > 80%
- Memory usage > 80%

#### Monitoring Tools
- Prometheus + Grafana (recommended)
- Datadog
- New Relic
- CloudWatch (AWS)

## Maintenance

### Database Maintenance

#### Vacuum and Analyze
```sql
-- Regular maintenance (weekly)
VACUUM ANALYZE;

-- Specific tables after bulk operations
VACUUM ANALYZE bot_channels;
```

#### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Index Maintenance
```sql
-- Check index usage
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Rebuild fragmented indexes (rare)
REINDEX INDEX idx_bot_channels_work;
```

#### Backup Strategy
```bash
# Daily automated backup
pg_dump -U discord_bot discord_clip_saver > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U discord_bot discord_clip_saver < backup_20251009.sql

# Continuous backup (recommended)
# Use WAL archiving or streaming replication
```

### Application Updates

#### Update Process
1. **Backup database**
2. **Pull latest code**
   ```bash
   git pull origin main
   ```
3. **Update dependencies**
   ```bash
   pip install -r requirements.txt --upgrade
   ```
4. **Review changelog** for breaking changes
5. **Test in staging** (if available)
6. **Restart bot**
   ```bash
   # Graceful shutdown
   kill -SIGTERM <pid>
   # Or use systemd/docker
   systemctl restart discord-bot
   docker restart discord-bot
   ```
7. **Monitor logs** for errors
8. **Verify health endpoint**

#### Rollback Procedure
1. Stop bot
2. Revert code: `git checkout <previous-commit>`
3. Restore database from backup (if schema changed)
4. Restart bot
5. Verify operation

### Data Cleanup

#### Manual Cleanup
```sql
-- Remove orphaned channel scan runs (should be auto-cleaned by CASCADE)
DELETE FROM bot_channel_scan_runs 
WHERE channel_id NOT IN (SELECT channel_id FROM bot_channels);

-- Clean up old scan runs (keep last 30 days)
DELETE FROM bot_channel_scan_runs 
WHERE created_at < NOW() - INTERVAL '30 days';
```

#### Automated Cleanup
Scheduled jobs handle:
- Expired install intents (every 30 minutes)
- Future: Old scan run history
- Future: Archived guild data

### Scheduled Jobs

#### View Active Jobs
Jobs are managed by APScheduler internally. Check logs for:
```
INFO apscheduler.scheduler - Added job "purge_install_intents_job"
INFO apscheduler.scheduler - Running job "purge_install_intents_job"
```

#### Modify Job Schedule
Edit `settings.default.yml`:
```yaml
database_settings_defaults:
  install_intent_purge_cron: "0 * * * *"  # Change to hourly
```
Restart bot to apply.

## Troubleshooting

### Common Issues

#### Bot Won't Start

**Invalid Token:**
```
CRITICAL discord_clip_saver - Invalid bot token
```
**Solution:** Verify `BOT_TOKEN` in `.env` file

**Database Connection Failed:**
```
CRITICAL discord_clip_saver - Database connection failed
```
**Solution:** 
- Check PostgreSQL is running
- Verify credentials in `.env`
- Test connection: `psql -h localhost -U discord_bot -d discord_clip_saver`

**Port Already in Use:**
```
ERROR uvicorn - Cannot bind to port 8000
```
**Solution:** Change port in `main.py` or kill process using port

#### Bot Disconnects Frequently

**Possible Causes:**
- Network instability
- Rate limiting (check logs for 429 errors)
- Discord API issues (check Discord status)

**Solution:**
- Check network connectivity
- Review rate limit strategy
- Monitor Discord.py auto-reconnect behavior

#### Missing Guilds/Channels

**Symptoms:** Guilds or channels not appearing in database

**Possible Causes:**
- Missing permissions
- Bot not in guild
- Sync failed silently

**Solution:**
```sql
-- Check guilds in database
SELECT guild_id, name FROM bot_guilds;

-- Check channels for guild
SELECT channel_id, name FROM bot_channels WHERE guild_id = '123';
```
- Verify bot is in guild (Discord developer portal)
- Check logs for permission errors
- Trigger manual sync (future: add command)

#### Slow Performance

**Database Queries Slow:**
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- Check slow queries in logs
```

**High Memory Usage:**
- Check for memory leaks with `psutil`
- Monitor Discord.py cache size
- Verify no infinite loops in event handlers

### Debug Mode

#### Enable Debug Logging
In `logger.py`, change:
```python
"discord_clip_saver": {
    "level": "DEBUG",  # Changed from INFO
    ...
}
```

#### Additional Debug Info
```python
# Add to event handlers for troubleshooting
logger.debug("Guild sync: processing guild_id=%s name=%s", guild.id, guild.name)
logger.debug("Database operation: %s with params %s", sql, params)
```

### Emergency Procedures

#### Bot Misbehaving
1. **Stop immediately:** `kill -SIGTERM <pid>` or `docker stop discord-bot`
2. **Check logs** for root cause
3. **Review recent changes**
4. **Test in isolated environment**
5. **Rollback if necessary**

#### Database Corruption
1. **Stop bot**
2. **Backup current state** (even if corrupt)
3. **Run integrity checks:**
   ```sql
   SELECT * FROM pg_stat_database WHERE datname = 'discord_clip_saver';
   ```
4. **Restore from last good backup**
5. **Replay recent changes** if possible

#### Data Loss
1. **Stop bot immediately**
2. **Don't write new data**
3. **Restore from backup**
4. **Investigate cause** (hardware failure, user error, bug)
5. **Implement safeguards** to prevent recurrence

## Performance Tuning

### Database Optimization

#### Connection Pooling
```python
# Future: Use connection pool
from psycopg_pool import AsyncConnectionPool
pool = AsyncConnectionPool(
    conninfo=dsn,
    min_size=5,
    max_size=20,
    timeout=30
)
```

#### Query Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bot_channels WHERE guild_id = '123';

-- Add missing indexes if needed
CREATE INDEX idx_custom ON table_name(column_name);
```

#### Batch Size Tuning
```python
# Adjust batch sizes in gather functions
# Trade-off: Larger batches = fewer round trips, more memory
BATCH_SIZE = 100  # Tune based on memory and network
```

### Application Optimization

#### Reduce Discord API Calls
- Cache frequently accessed data
- Use bulk endpoints
- Batch operations where possible

#### Memory Management
```python
# Clear Discord.py caches periodically (careful)
# bot.guilds is cached, consider periodic refresh
```

#### Async Concurrency
```python
# Process multiple guilds concurrently
await asyncio.gather(*[sync_channels(bot, g) for g in bot.guilds])
```

## Disaster Recovery

### Backup Strategy

#### What to Backup
- PostgreSQL database (critical)
- `.env` configuration (encrypted)
- `settings.default.yml`
- Bot application code (git handles this)

#### Backup Schedule
- **Full database backup**: Daily
- **Incremental backup**: Hourly (via WAL archiving)
- **Configuration files**: On change
- **Code**: Git commits

#### Backup Storage
- Local backup: Fast recovery, risky
- Cloud storage: S3, Google Cloud Storage (recommended)
- Multiple locations: Follow 3-2-1 rule

### Recovery Procedures

#### Full Recovery
1. Provision new environment
2. Install dependencies
3. Restore database from backup
4. Deploy application code
5. Restore configuration
6. Start bot
7. Verify operation

#### Partial Recovery
- Lost guilds: Rejoin bot to guilds, auto-sync
- Lost channels: Trigger sync for specific guild
- Corrupted settings: Restore from backup or reapply defaults

#### Recovery Time Objective (RTO)
- Target: < 1 hour for full recovery
- Target: < 15 minutes for partial recovery

#### Recovery Point Objective (RPO)
- Target: < 1 hour of data loss acceptable
- Achieve with hourly backups
