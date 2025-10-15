# Docker Deployment Guide

## Quick Start

### 1. Build and Run Everything

```bash
# Build and start all services
docker-compose up --build
```

This starts:
- **Bot** (Discord bot + API server) on port 8000
- **Worker** (Job processor) - 1 instance by default
- **Interface** (Web UI) on port 3000
- **Redis** (Job queue) on port 6379
- **PostgreSQL** (Database) on port 5432

### 2. Scale Workers

Run multiple worker instances for better performance:

```bash
# Run with 3 workers
docker-compose up --scale worker=3

# Or run in background with 5 workers
docker-compose up --scale worker=5 -d
```

Each worker will process jobs from the Redis queue independently.

### 3. Run Specific Services

**Start only bot and dependencies:**
```bash
docker-compose up bot dcs-postgres dcs-redis
```

**Start only worker and dependencies:**
```bash
docker-compose up worker dcs-postgres dcs-redis
```

## Environment Configuration

### Required Files

1. **`.env.global`** - Global configuration (database, Redis, storage)
2. **`python/bot/.env`** - Bot-specific settings
3. **`python/worker/.env`** - Worker-specific settings
4. **`interface/.env`** - Interface-specific settings

### Storage Configuration

Edit `.env.global`:

**Local Storage (Default):**
```bash
STORAGE_TYPE=local
STORAGE_PATH=/app/storage
```

**Google Cloud Storage:**
```bash
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=my-discord-clips-bucket
GCS_PROJECT_ID=my-gcp-project
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-key.json
```

Then mount the service account key:
```yaml
volumes:
  - ./gcp-key.json:/app/gcp-key.json:ro
```

## Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f worker
docker-compose logs -f bot

# All workers
docker-compose logs -f worker
```

### Restart Services

```bash
# Restart all workers
docker-compose restart worker

# Restart bot
docker-compose restart bot

# Restart everything
docker-compose restart
```

### Stop Services

```bash
# Stop all
docker-compose down

# Stop and remove volumes (DELETES DATA!)
docker-compose down -v
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it dcs-postgres psql -U discord -d discord_clip_saver

# Run SQL query
docker exec -it dcs-postgres psql -U discord -d discord_clip_saver -c "SELECT COUNT(*) FROM clip;"

# Add settings_hash column (if needed)
docker exec -it dcs-postgres psql -U discord -d discord_clip_saver -c "ALTER TABLE clip ADD COLUMN settings_hash VARCHAR(32);"
```

### Redis Access

```bash
# Connect to Redis CLI
docker exec -it dcs-redis redis-cli

# Check job streams
docker exec -it dcs-redis redis-cli KEYS "jobs:*"

# View stream info
docker exec -it dcs-redis redis-cli XINFO STREAM "jobs:guild:123:batch"
```

### Storage Access

```bash
# List thumbnails (when using local storage)
docker exec -it <worker-container-id> ls -lah /app/storage/thumbnails/

# Copy thumbnail from container
docker cp <worker-container-id>:/app/storage/thumbnails/guild_123/clip_abc.webp ./
```

## Scaling for Production

### 1. Multiple Workers

```bash
# Run 10 workers for high throughput
docker-compose up --scale worker=10 -d
```

### 2. Resource Limits

Add to `docker-compose.yml`:
```yaml
worker:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### 3. Health Checks

Add to worker service:
```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import sys; sys.exit(0)"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 4. Logging

Configure logging driver:
```yaml
worker:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## Troubleshooting

### Worker Not Processing Jobs

1. Check worker is running:
   ```bash
   docker-compose ps worker
   ```

2. Check worker logs:
   ```bash
   docker-compose logs worker | grep ERROR
   ```

3. Verify Redis connection:
   ```bash
   docker exec -it dcs-redis redis-cli PING
   ```

4. Check pending jobs:
   ```bash
   docker exec -it dcs-redis redis-cli XINFO STREAM "jobs:guild:YOUR_GUILD_ID:batch"
   ```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps dcs-postgres

# Test connection
docker exec -it dcs-postgres pg_isready -U discord

# Check database exists
docker exec -it dcs-postgres psql -U discord -l
```

### Storage Permission Errors

```bash
# Fix permissions on storage volume
docker-compose exec worker chmod -R 755 /app/storage
```

### Missing settings_hash Column

```bash
# Add the column
docker exec -it dcs-postgres psql -U discord -d discord_clip_saver -c "ALTER TABLE clip ADD COLUMN settings_hash VARCHAR(32);"
```

### Worker Crashes on Startup

1. Check environment variables:
   ```bash
   docker-compose config
   ```

2. Check if all dependencies are available:
   ```bash
   docker-compose up dcs-postgres dcs-redis
   # Wait for them to be ready, then:
   docker-compose up worker
   ```

3. Rebuild without cache:
   ```bash
   docker-compose build --no-cache worker
   docker-compose up worker
   ```

## Architecture

```
┌─────────────┐
│   Discord   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│     Bot     │────▶│  PostgreSQL  │
│  (API+Bot)  │     └──────────────┘
└──────┬──────┘
       │
       │ Push Jobs
       ▼
┌─────────────┐
│    Redis    │
│ (Job Queue) │
└──────┬──────┘
       │
       │ Pull Jobs
       ▼
┌─────────────┐     ┌──────────────┐
│   Worker    │────▶│   Storage    │
│ (x1 to xN)  │     │ (Local/GCS)  │
└─────────────┘     └──────────────┘
```

- **Bot** receives Discord events, pushes jobs to Redis
- **Redis** queues jobs for processing
- **Worker(s)** pull jobs, process messages, generate thumbnails
- **Storage** persists thumbnails (local volume or cloud)
- **PostgreSQL** stores all metadata

## Next Steps

1. Configure your `.env` files
2. Run `docker-compose up --build`
3. Scale workers based on load: `docker-compose up --scale worker=N`
4. Monitor logs: `docker-compose logs -f`
5. For production, switch to cloud storage (GCS)
