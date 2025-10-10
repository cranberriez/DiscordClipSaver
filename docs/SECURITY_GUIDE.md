# Security Guide

## Security Overview

This document outlines security considerations and best practices for the Discord Clip Saver bot.

## Authentication & Authorization

### Bot Token Security

#### Storage
```python
# ✅ Environment variable
TOKEN = os.getenv("BOT_TOKEN")

# ❌ Never hardcode
# TOKEN = "MTIzNDU2..."
```

#### Protection
- Never commit to version control
- Store in `.env` (add to `.gitignore`)
- Use secrets manager in production
- Rotate if compromised

#### Validation
```python
def validate_bot_token(token: str) -> bool:
    if not token or len(token.split('.')) != 3:
        logger.error("Invalid token format")
        return False
    return True

# Check on startup
if not validate_bot_token(TOKEN):
    sys.exit(1)
```

### Database Credentials

#### Requirements
- Minimum 16 characters
- Random generation
- Unique per environment
- Never logged

```python
# Generate secure password
import secrets, string
password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20))
```

## Input Validation

### Discord IDs
```python
import re
SNOWFLAKE_PATTERN = re.compile(r'^\d{17,19}$')

def validate_snowflake(id_str: str) -> bool:
    if not SNOWFLAKE_PATTERN.match(id_str):
        return False
    timestamp_ms = (int(id_str) >> 22) + 1420070400000
    return 1420070400000 <= timestamp_ms <= time.time() * 1000
```

### User Input Sanitization
```python
def sanitize_discord_name(name: str, max_length: int = 100) -> str:
    # Remove control characters
    sanitized = ''.join(c for c in name if c.isprintable() and c != '\x00')
    return sanitized[:max_length].strip() or "unknown"
```

### Settings Validation
```python
def validate_guild_settings(settings: dict) -> dict:
    if not isinstance(settings, dict):
        raise ValueError("Settings must be dict")
    
    # Size limit
    if len(json.dumps(settings)) > 65536:
        raise ValueError("Settings exceed 64KB")
    
    # Type checking for known fields
    if 'max_file_size_mb' in settings:
        if not 0 < settings['max_file_size_mb'] <= 500:
            raise ValueError("Invalid file size")
    
    return settings
```

## SQL Injection Prevention

### Always Use Parameterized Queries

#### ✅ CORRECT
```python
await cur.execute("SELECT * FROM bot_guilds WHERE guild_id = %s", (guild_id,))
await cur.executemany("INSERT INTO bot_guilds VALUES (%s, %s)", [(id, name) for ...])
```

#### ❌ NEVER DO
```python
# await cur.execute(f"SELECT * FROM bot_guilds WHERE guild_id = '{guild_id}'")
```

### Dynamic Queries
```python
def build_safe_order_by(column: str) -> str:
    ALLOWED = {'guild_id', 'name', 'created_at'}
    if column not in ALLOWED:
        raise ValueError("Invalid column")
    return f"ORDER BY {column}"
```

## Data Protection

### Encryption

#### In Transit
```python
# Discord API: TLS automatic
# Database: SSL required
config = PostgresConfig(sslmode='require')
```

#### At Rest
- Use encrypted disk volumes
- Enable database encryption

### Data Minimization
```python
# ✅ Store only what's needed
snapshot = GuildSnapshot(id=guild.id, name=guild.name, icon=guild.icon)

# ❌ Don't store
# - Message content (except scan results)
# - Full user profiles
# - Unnecessary metadata
```

### Data Retention
```sql
-- Delete old scan runs (90 days)
DELETE FROM bot_channel_scan_runs WHERE created_at < NOW() - INTERVAL '90 days';
```

## Access Control

### Database Permissions
```sql
-- Least privilege
CREATE USER discord_bot WITH PASSWORD 'secure';
GRANT CONNECT ON DATABASE discord_clip_saver TO discord_bot;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO discord_bot;
-- Don't grant: SUPERUSER, DROP, CREATE DATABASE
```

### Discord Permissions
```
Required: View Channels, Read Messages, Read Message History
Optional: Send Messages (commands), Embed Links
```

## Rate Limiting

### Discord API
```python
# discord.py handles automatically
# Batch operations where possible
channels = [c for c in guild.channels]  # Single call
```

### API Rate Limiting (Future)
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.get("/guilds")
@limiter.limit("10/minute")
async def list_guilds():
    return {"guilds": [...]}
```

## Logging Security

### Never Log
- Bot tokens
- Database passwords
- Connection strings with passwords
- User emails or PII

### Safe Logging
```python
# ✅ Safe
logger.info("Guild sync for %s", guild_id)
logger.debug("Database connected to %s:%s", host, port)

# ❌ Unsafe
# logger.debug("Token: %s", TOKEN)
# logger.debug("DSN: %s", dsn)
```

### Log Rotation
```python
from logging.handlers import RotatingFileHandler
handler = RotatingFileHandler('bot.log', maxBytes=10_000_000, backupCount=5)
```

## Security Checklist

### Deployment
- [ ] Bot token in environment variable
- [ ] Database credentials secure
- [ ] `.env` in `.gitignore`
- [ ] Database SSL enabled
- [ ] Minimum Discord permissions
- [ ] Input validation on all external data
- [ ] Parameterized queries everywhere
- [ ] No secrets in logs
- [ ] Regular security updates

### Monitoring
- [ ] Failed authentication attempts logged
- [ ] Rate limit violations monitored
- [ ] Unusual database activity alerted
- [ ] Error rates tracked
- [ ] Log aggregation configured

### Maintenance
- [ ] Regular dependency updates
- [ ] Security patches applied
- [ ] Database backups encrypted
- [ ] Access logs reviewed
- [ ] Incident response plan documented

## Incident Response

### Security Incident Steps
1. **Detect**: Monitor alerts, logs, unusual activity
2. **Contain**: Disable compromised credentials immediately
3. **Investigate**: Review logs, identify scope
4. **Remediate**: Rotate credentials, patch vulnerabilities
5. **Recover**: Restore from clean backups if needed
6. **Learn**: Document incident, update procedures

### Token Compromise
1. Regenerate bot token in Discord Developer Portal immediately
2. Update environment variable
3. Restart bot
4. Review audit logs for unauthorized actions
5. Notify affected guilds if data accessed

### Database Breach
1. Disconnect database immediately
2. Change all database credentials
3. Review access logs
4. Assess data exposure
5. Notify users if required by regulations
6. Implement additional security measures

## Compliance

### Discord ToS
- Respect rate limits
- Proper intent declaration
- No automated user actions
- Data privacy compliance

### Data Privacy
- GDPR: Right to erasure (delete guild data on request)
- CCPA: Data access requests
- Minimal data collection
- Clear privacy policy

### Security Standards
- OWASP Top 10 awareness
- Regular security audits
- Penetration testing (optional)
- Security training for developers
