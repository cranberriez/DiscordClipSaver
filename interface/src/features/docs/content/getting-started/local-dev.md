# Local development

Use either the complete Docker stack for realistic integration testing or Docker only for PostgreSQL and Redis while you run the interface and Python services directly.

## Prerequisites

- Node.js 20 or newer.
- Python 3.12 or 3.13. The current asyncpg dependency does not support Python 3.14.
- Docker Desktop/Engine with Docker Compose.
- FFmpeg only when a worker runs directly on your machine; Docker worker images include it. See [FFmpeg setup](/docs/setup/ffmpeg).
- A Discord test application with localhost redirect URLs; see [Discord application setup](/docs/setup/discord-application).

## Option A: full Docker stack

Copy `.env.example` to `.env` and `.env.global.example` to `.env.global`, add real Discord credentials, then run:

```bash
docker compose up -d --build
docker compose logs -f bot-api bot-discord worker interface
```

Open `http://localhost:3000`. This is the quickest option when you need all services, including database schema initialization, to behave like a deployment.

## Option B: Docker infrastructure, host processes

Start only the dependencies:

```bash
docker compose up -d dcs-postgres dcs-redis
```

Create the relevant service-local env files under `interface/`, `python/bot/`, and `python/worker/`. Use `localhost` for database and Redis addresses in direct host processes, rather than Docker service names. Initialize the database from `python/`:

```bash
python -m shared.db.schema
```

Run the interface:

```bash
cd interface
npm install
npm run dev
```

In separate terminals, create and activate a Python virtual environment, then install dependencies from `python/`:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r bot/requirements.txt
pip install -r worker/requirements.txt
```

Start the bot API, the Discord gateway, and a worker as independent processes:

```bash
BOT_RUNTIME_MODE=api python -m bot.main
BOT_RUNTIME_MODE=discord python -m bot.main
python -m worker.main
```

On Windows PowerShell, set a mode before the command, for example `$env:BOT_RUNTIME_MODE = "api"; python -m bot.main`. You can use `BOT_RUNTIME_MODE=all` for a combined bot process, or `WORKER_MODE=maintenance` to test only database/storage cleanup and thumbnail work.

## Useful checks

```bash
# Interface
cd interface
npm run lint
npm run build

# Python storage tests
cd python
python -m unittest shared.storage.tests.test_storage
```

For a browser-facing test, verify that `NEXTAUTH_URL` matches the exact local address and that Discord has both localhost callback routes registered.
