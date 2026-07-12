# Environment and service patterns

Docker Compose uses two root files. `.env` holds user-specific secrets and public routing values; `.env.global` holds shared runtime defaults. Copy both examples before running Compose:

```bash
cp .env.example .env
cp .env.global.example .env.global
```

## Required values

Set these in `.env` before starting an application stack:

| Value                                               | Purpose                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `BOT_TOKEN`                                         | Discord bot credential                                    |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`        | Discord OAuth login                                       |
| `NEXTAUTH_SECRET`                                   | session-signing secret                                    |
| `INTERNAL_API_TOKEN`, `INTERNAL_HEALTH_TOKEN`       | private service-to-service tokens                         |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | database initialization                                   |
| `PUBLIC_DOMAIN`, `ACME_EMAIL`                       | production HTTPS routing                                  |
| `TRAEFIK_DASHBOARD_AUTH`                            | required basic-auth value for the local Compose dashboard |

Generate each secret independently, for example with `openssl rand -hex 32`. Do not use sample `changeme` values outside a disposable local environment.

## Full local Docker stack

This is the simplest way to test the complete application locally. It builds local images and exposes the interface on `http://localhost:3000`.

```bash
docker compose up -d --build
docker compose logs -f bot-api bot-discord worker interface
```

## Production Docker stack

Use `docker-compose-prod.yml` on a public Linux host. It pulls published images, starts Traefik on ports 80/443, and persists PostgreSQL, Redis, and thumbnail data in named Docker volumes.

```bash
docker compose -f docker-compose-prod.yml pull
docker compose -f docker-compose-prod.yml up -d
```

Back up PostgreSQL and `worker_storage` when local thumbnail storage is in use. `docker compose down -v` removes named volumes and deletes that data.

## Split local development

Run only infrastructure in Docker when you want hot reload for the interface or direct Python debugging:

```bash
docker compose up -d dcs-postgres dcs-redis
```

Then configure service-local env files as needed under `interface/`, `python/bot/`, and `python/worker/`, initialize tables with `python -m shared.db.schema` from `python/`, and run services in separate terminals. The [local development guide](/docs/getting-started/local-dev) has the command sequence.

`BOT_RUNTIME_MODE=api` runs FastAPI only; `BOT_RUNTIME_MODE=discord` runs the gateway listener only. `WORKER_MODE=maintenance` processes database/storage cleanup and thumbnail work without a Discord worker client. The default `all` modes run every responsibility appropriate to the process.
