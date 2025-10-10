# Configuration Documentation

## Environment Variables

### Required

- **BOT_TOKEN**: Discord bot token (from Discord Developer Portal)

### Database Configuration

- **DB_TYPE** or **DATABASE_TYPE**: Database type (default: `postgres`)
- **POSTGRES_HOST** or **DB_HOST**: Database host (default: `localhost`)
- **POSTGRES_PORT** or **DB_PORT**: Database port (default: `5432`)
- **POSTGRES_USER** or **DB_USER**: Database username (default: `postgres`)
- **POSTGRES_PASSWORD** or **DB_PASSWORD**: Database password (default: `postgres`)
- **POSTGRES_DB** or **DB_NAME**: Database name (default: `postgres`)
- **POSTGRES_DSN** or **DATABASE_URL**: Full connection string (overrides individual params)

### Optional

- **DEFAULT_SETTINGS_PATH**: Custom path for default settings YAML file

## Settings File

**Default Location**: `settings.default.yml` in project root

### Structure

```yaml
guild_settings_defaults:
  # Per-guild default settings
  
database_settings_defaults:
  # Database job configuration
  install_intent_purge_cron: "*/30 * * * *"
  install_intent_purge_grace_seconds: 360
```

## Loading Configuration

The `SettingsService` loads configuration on startup:
```python
settings_service = SettingsService()  # Uses default path
settings_service = SettingsService("/path/to/settings.yml")  # Custom path
```

## Accessing Configuration

```python
# Get nested value
value = settings_service.get_config("section", "key")

# With default
value = settings_service.get_config("section", "key", default="fallback")
```

## Logging Configuration

**File**: `logger.py`

Configures logging for all components:
- Bot logs: `discord_clip_saver` (DEBUG level)
- Discord.py: `discord` (INFO level)
- Uvicorn: `uvicorn`, `uvicorn.error`, `uvicorn.access` (INFO level)

All logs output to console with timestamp format.
