# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord Clip Saver is a self-hosted system that automatically archives video clips from Discord servers. It consists of three services: a Python Discord bot, a Python async worker, and a Next.js web interface — all backed by PostgreSQL and Redis.

## Architecture

The system has four main processes that communicate through shared infrastructure:

```
Discord API ─── Bot (discord.py + FastAPI) ── PostgreSQL (Tortoise ORM)
                        │                             │
                        └──── Redis Streams ──── Worker (asyncio)
                                                      │
Interface (Next.js) ──────── PostgreSQL (Kysely) ─────┘
                    └─────── Bot API (HTTP :8000)
```

**Bot** (`python/bot/`): A discord.py client with an embedded FastAPI server on port 8000. Listens to real-time Discord events, syncs guild/channel state to the database, batches live messages via `MessageBatcher`, and queues scan jobs onto Redis Streams. The `ScanService` detects gaps in message history and queues backfill jobs.

**Worker** (`python/worker/`): An asyncio service that pulls jobs from Redis Streams using a consumer group (`worker_group`), allowing horizontal scaling (`docker compose up --scale worker=N`). Processes two job types: `batch` (historical channel scans fetching message history via Discord HTTP API) and `message` (individual real-time messages). Also handles thumbnail generation via FFmpeg/Pillow and the `purge` operation. Stale scan and thumbnail cleanup loops run on background tasks.

**Interface** (`interface/`): Next.js 15 App Router application. Uses Kysely (not Tortoise) to query the same PostgreSQL database directly. Authentication is Discord OAuth via NextAuth.js. API routes are strictly layered — route handlers validate/auth, then delegate all DB access to query functions in `lib/db/queries/`. TanStack Query manages client-side caching and refetching.

**Shared Python** (`python/shared/`): Database models (Tortoise ORM), Redis client, storage backends (local filesystem or GCS), settings loader, and logging config. Imported by both bot and worker.

### Settings System

Settings flow from `settings.default.jsonc` (server-level defaults) → `GuildSettings.default_channel_settings` (guild overrides) → `ChannelSettings.settings` (channel overrides). The `settings_hash` field on Guild/Channel/Clip records detects when settings change and clips need reprocessing. The `shared/settings_resolver.py` and `shared/user_settings_resolver.py` handle resolution logic.

### Redis Streams Job Format

Jobs are pushed to per-guild streams (key pattern includes guild ID). Workers read via `XREADGROUP`, acknowledge on success, and leave unacknowledged on failure for automatic retry. A separate `claim_pending_jobs.py` script can reclaim orphaned jobs.

### Clip ID

Clips use a deterministic MD5 hash: `md5(message_id + channel_id + filename + timestamp)` as their primary key.

## Development Commands

### Full Stack (Docker)

```bash
docker compose up -d                          # Start everything
docker compose up -d dcs-postgres dcs-redis  # Start only infrastructure
docker compose logs -f bot                    # Follow bot logs
docker compose up --scale worker=3           # Run 3 workers
```

### Bot (Python)

```bash
cd python
python -m venv venv && source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r bot/requirements.txt
python -m bot.main
```

### Worker (Python)

```bash
cd python
python -m worker.main
```

### Interface (Node)

```bash
cd interface
npm install
npm run dev       # Development with Turbopack
npm run build     # Production build
npm run lint      # ESLint
```

## Environment Variables

The project uses a layered env file pattern:

- `.env.global` / `.env.global.example` — shared secrets (DB credentials, Discord tokens, Redis URL)
- `python/bot/.env`, `python/worker/.env`, `interface/.env` — service-specific variables

Key variables: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `POSTGRES_USER/PASSWORD/DB`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `BOT_API_URL`.

## Code Style

- **Python**: Reusability, extensibility, simplicity; follow SOLID without sacrificing simplicity; keep DRY.
- **Interface**: TypeScript strict mode. DB files use `snake_case.ts` (matching table names), React components use `PascalCase.tsx`, hooks use `usePascalCase.ts`.
- **Formatting**: Prettier is configured for both the interface (`prettier.config.mjs`) and root (`.prettierrc.json`).
- **Do not create documentation** without being asked (per `.windsurf/rules/documentation-guide.md`).

## Database

Python services use **Tortoise ORM** with `asyncpg`. Models are in `python/shared/db/models.py`. Repositories in `python/shared/db/repositories/` encapsulate all query logic.

The Next.js interface uses **Kysely** with `pg` for type-safe SQL. Schemas are in `interface/src/lib/db/schemas/`, queries in `interface/src/lib/db/queries/`. Never put DB logic directly in route handlers.

## Storage

The `python/shared/storage/` module abstracts file storage behind a `BaseStorage` interface. `factory.py` selects local filesystem or Google Cloud Storage based on config. Thumbnails are stored here and served by the interface via a shared Docker volume (`worker_storage`).
