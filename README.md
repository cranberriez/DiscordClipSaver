# Discord Clip Saver

Discord Clip Saver is a Discord bot that saves clips from Discord to a database.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

# Local Development

Use the complete Docker stack for integration testing, or run only PostgreSQL
and Redis in Docker while developing the Python services and interface directly
on the host.

## Prerequisites

- Python 3.12 or 3.13 (the current `asyncpg` dependency does not support 3.14)
- Node.js 20 or newer
- Docker with Docker Compose
- FFmpeg when running a worker on the host; the Docker worker image includes it

See the [worker README](python/worker/README.md#setup) for FFmpeg installation.

## Environment Files

The examples are split by execution environment because Docker service names and
container paths do not work in processes launched directly on the host.

| Example                  | Copy to          | Used by                                       |
| ------------------------ | ---------------- | --------------------------------------------- |
| `.env.example`           | `.env`           | Required Docker Compose values and secrets    |
| `.env.global.example`    | `.env.global`    | Shared Docker Compose runtime defaults        |
| `python/.env.example`    | `python/.env`    | Host-run bot API, Discord gateway, and worker |
| `interface/.env.example` | `interface/.env` | Host-run Next.js interface                    |

Do not copy `.env.global` into a package. Its defaults use container addresses
such as `dcs-postgres` and `dcs-redis` and container paths such as
`/app/storage`. The package examples use `localhost` and host filesystem paths.

If you change the PostgreSQL credentials from the root defaults, make the same
changes in both package-local files. `INTERNAL_API_TOKEN` must also match in
`python/.env` and `interface/.env`.

Legacy `python/bot/.env` or `python/worker/.env` files may take precedence over
`python/.env` during dotenv discovery. Remove or update them when switching to
the shared Python environment file.

## Option A: Full Docker Stack

From the repository root:

```bash
cp .env.example .env
cp .env.global.example .env.global
```

Fill in the required Discord credentials and replace the placeholder secrets in
`.env`. Then start the complete stack:

```bash
docker compose up -d --build
docker compose logs -f bot-api bot-discord worker interface
```

Compose starts PostgreSQL, Redis, the schema initializer, bot API, Discord
gateway, worker, and interface. Open `http://localhost:3000`.

### Google Cloud credentials with Docker

GCS uses a service-account JSON file that must already exist on the Docker
host. Keep it outside the repository; for example:

```text
# Linux server
/opt/discordclipsaver/secrets/gcs-service-account.json

# Windows
C:/Users/yourname/.gcp/discordclipsaver-gcs.json
```

Set its absolute **host path** in the root `.env` file:

```dotenv
GCS_CREDENTIALS_FILE="/opt/discordclipsaver/secrets/gcs-service-account.json"
```

In `.env.global`, enable GCS and use the fixed **container path**:

```dotenv
STORAGE_TYPE="gcs"
GCS_BUCKET_NAME="your-private-bucket"
GCS_PROJECT_ID="your-gcp-project"
GOOGLE_APPLICATION_CREDENTIALS="/var/run/secrets/google/service-account.json"
GCS_SIGNED_URL_TTL_SECONDS=3900
THUMBNAIL_BROWSER_CACHE_SECONDS=3600
```

Start the stack with the GCS Compose overlay:

```bash
# Build images from this checkout
docker compose -f docker-compose.yml -f docker-compose.gcs.yml up -d --build

# Production deployment using the prebuilt images
docker compose -f docker-compose-prod.yml -f docker-compose.gcs.yml up -d
```

The overlay does not copy the credential into an image or volume. It
read-only bind-mounts the file from `GCS_CREDENTIALS_FILE` on the host to
`/var/run/secrets/google/service-account.json` in both the worker and interface
containers. Consequently, `GOOGLE_APPLICATION_CREDENTIALS` must contain the
container path, not the host path. Recreate those containers after changing
either setting.

Define each cache setting only once. `THUMBNAIL_BROWSER_CACHE_SECONDS` must be
at least 30 seconds shorter than `GCS_SIGNED_URL_TTL_SECONDS`.

## Option B: Docker Infrastructure with Host Services

Create the root files required by Compose and the host-local package files:

```bash
cp .env.example .env
cp .env.global.example .env.global
cp python/.env.example python/.env
cp interface/.env.example interface/.env
```

Add the Discord credentials and replace placeholder secrets in the package
files. Keep the hostnames as `localhost`. Register
`http://localhost:3000/api/auth/callback/discord` as a redirect URL for the
Discord application.

Start PostgreSQL and Redis:

```bash
docker compose up -d dcs-postgres dcs-redis
```

### Python Services

Create and activate a virtual environment, install dependencies, and initialize
missing database tables:

```bash
cd python
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r bot/requirements.txt
pip install -r worker/requirements.txt
python -m shared.db.schema
```

Run each process from `python/` in a separate terminal:

```bash
# Linux/macOS
BOT_RUNTIME_MODE=api python -m bot.main
BOT_RUNTIME_MODE=discord python -m bot.main
python -m worker.main
```

In Windows PowerShell, set the mode before launching the process:

```powershell
$env:BOT_RUNTIME_MODE = "api"; python -m bot.main
$env:BOT_RUNTIME_MODE = "discord"; python -m bot.main
python -m worker.main
```

`BOT_RUNTIME_MODE=all` combines the API and gateway in one bot process.
`WORKER_MODE=maintenance` runs only database/storage maintenance and thumbnail
jobs, without starting a Discord worker client. Leave `DB_GENERATE_SCHEMAS=0`
after running the explicit schema command.

### Interface

The interface requires PostgreSQL for browsing data. Redis supports cache
invalidation, while the bot API is needed for Discord actions.

```bash
cd interface
npm install
npm run dev
```

Open `http://localhost:3000`. For a host-run interface,
`BOT_API_URL=http://localhost:8000`; Docker Compose supplies
`http://bot-api:8000` to its interface container.

### Google Cloud credentials for host-run services

When the Python worker or Next.js interface runs directly on the host, Docker
does not mount the credential. Store the service-account JSON somewhere
readable by your user and outside the repository, then set its absolute host
path in both `python/.env` and `interface/.env`:

```dotenv
# Linux/macOS example
GOOGLE_APPLICATION_CREDENTIALS="/home/yourname/.gcp/discordclipsaver-gcs.json"

# Windows example
GOOGLE_APPLICATION_CREDENTIALS="C:/Users/yourname/.gcp/discordclipsaver-gcs.json"
```

Also set `STORAGE_TYPE=gcs`, `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, and the same
cache values in each host-run service that accesses thumbnails. Do not set
`GCS_CREDENTIALS_FILE` in package-local environment files; that variable is
only for the root Docker Compose overlay.

## Useful Checks

```bash
# From interface/
npm run lint
npm test
npm run build

# From python/
python -m unittest shared.storage.tests.test_storage
```
