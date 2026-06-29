# Docker Deployment Guide

## Quick Start

### 1. Build and Run Everything

```bash
# Build and start all services
docker-compose up --build
```

This starts:

-   **DB Schema** (one-shot initializer) to create missing PostgreSQL tables
-   **Bot API** (FastAPI server for Discord-backed API actions) on port 8000
-   **Discord Bot** (Discord gateway listener for live updates)
-   **Worker** (Job processor) - 1 instance by default
-   **Interface** (Web UI) on port 3000
-   **Redis** (Job queue) on port 6379
-   **PostgreSQL** (Database) on port 5432

### 2. Scale Workers

Run multiple worker instances for better performance:

```bash
# Run with 3 workers
docker-compose up --scale worker=3

# Or run in background with 5 workers
docker-compose up --scale worker=5 -d
```

Each worker will process jobs from the Redis queue independently.

Workers can be scoped with `WORKER_MODE`:

-   `all` - default; processes every job type and requires Discord bot connectivity.
-   `discord` - processes Discord-bound jobs: scans, message jobs, rescans, guild purge leave step.
-   `maintenance` - processes DB/storage jobs without Discord: thumbnail retry/cleanup, message deletion cleanup, channel purge.

For example, run maintenance jobs while the Discord bot is down:

```bash
WORKER_MODE=maintenance docker-compose up worker dcs-postgres dcs-redis
```

### 3. Run Bot Services

The bot image is split into two Docker services:

-   `bot-api` - serves FastAPI and API-owned scheduled maintenance without the Discord gateway. Discord REST-backed routes return 503 if `BOT_TOKEN` is unavailable or rejected.
-   `bot-discord` - runs the Discord gateway client and live message batching without binding the API port.

`BOT_RUNTIME_MODE=all|api|discord` is still available for standalone Python
runs, but Docker Compose sets the mode per service.

### 4. Run Specific Services

**Start only the bot API and database:**

```bash
docker-compose up bot-api dcs-postgres
```

**Start only the Discord gateway listener:**

```bash
docker-compose up bot-discord dcs-postgres dcs-redis
```

**Start only worker and dependencies:**

```bash
docker-compose up worker dcs-postgres dcs-redis
```

**Start only the web interface and database:**

```bash
docker-compose up interface dcs-postgres
```

The `db-schema` one-shot service is pulled in automatically by these app
services and must complete before they start.

The interface can browse existing data with PostgreSQL available. Redis, the bot
services, and workers are still needed for background jobs such as scans, purge
requests, thumbnail generation, and live Discord updates.

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
docker-compose logs -f bot-api
docker-compose logs -f bot-discord

# All workers
docker-compose logs -f worker
```

### Restart Services

```bash
# Restart all workers
docker-compose restart worker

# Restart bot services
docker-compose restart bot-api bot-discord

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
# Initialize or repair missing tables manually
docker-compose run --rm db-schema

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
                cpus: "1.0"
                memory: 512M
            reservations:
                cpus: "0.5"
                memory: 256M
```

### 3. Health Checks

The interface exposes `/health` for uptime monitoring. The response separates
required and optional dependencies:

```json
{
    "ok": true,
    "dependencies": {
        "database": { "ok": true, "required": true, "latencyMs": 12 },
        "redis": { "ok": false, "required": false, "error": "Redis unavailable" },
        "botApi": { "ok": false, "required": false },
        "storage": { "ok": true, "required": false, "latencyMs": 1 }
    }
}
```

An unavailable database returns HTTP 503. Optional dependency failures keep the
endpoint HTTP 200 so monitoring can distinguish a degraded interface from a down
interface. `BOT_API_TIMEOUT_MS` controls how long interface requests wait on the
optional bot API before continuing in degraded mode.

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

-   **Bot** receives Discord events, pushes jobs to Redis
-   **Redis** queues jobs for processing
-   **Worker(s)** pull jobs, process messages, generate thumbnails
-   **Storage** persists thumbnails (local volume or cloud)
-   **PostgreSQL** stores all metadata

## Next Steps

1. Configure your `.env` files
2. Run `docker-compose up --build`
3. Scale workers based on load: `docker-compose up --scale worker=N`
4. Monitor logs: `docker-compose logs -f`
5. For production, switch to cloud storage (GCS)
