# Discord Clip Saver

Discord Clip Saver is a Discord bot that saves clips from Discord to a database.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

# Local Development

## Prerequisites

-   Python >= 3.12 (<3.14.0, asyncpg has issues with 3.14)
-   Node.js >= 20
-   Docker (optional, recommended for production)
-   FFmpeg (required for thumbnail generation - see worker README for installation)

Docker is recommended for the full stack. PostgreSQL is the hard requirement for
the interface and API to browse existing data; Redis is required for queued
background work such as live scans, thumbnail jobs, and purge jobs.

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required secrets and public URLs
3. Copy `.env.global.example` to `.env.global` and tweak advanced defaults only if needed
4. Run `docker compose up -d` to start the containers, this will start the bot API, Discord bot listener, interface, postgres server, and redis server
5. Open the interface in your browser at `http://localhost:3000`

## Setup Local Interface / Bot

1. Clone the repository
2. Copy `.env.example` to `.env` and `.env.global.example` to `.env.global` for Docker infrastructure.
3. Copy the relevant service-local `.env` file in `/python/bot`, `/python/worker`, or `/interface` when running that service directly outside Docker.
4. Start the Postgres Server and Redis server with `docker compose up -d dcs-postgres dcs-redis`
5. Initialize missing database tables from the `/python` directory with `python -m shared.db.schema`

### Bot

The bot does not require the interface to be running to function. However some functionality is more easily access with the interface.
At the time of writing this, some functionality is tied to the interface calling the bot's API. This can be done instead with curl or any other HTTP client and will be described below.

1. (optional) create a virtual environment with `python -m venv venv` in the /python folder and activate it with `venv\Scripts\activate` or `source venv/bin/activate` on Linux
2. Navigate to the bot folder with `cd /python/bot`
3. Install the bot's dependencies with `pip install -r requirements.txt`
   TODO: MAKE THIS BETTER
4. Navigate back to python folder with `cd ..`
5. Run the bot in module mode with `python -m bot.main`

The Docker stack runs the `db-schema` initializer automatically. For standalone bot-only development, set `DB_GENERATE_SCHEMAS=1` only if you intentionally want the bot process to create missing tables on startup.

Set `BOT_RUNTIME_MODE=api` to run only the FastAPI server, or `BOT_RUNTIME_MODE=discord` to run only the Discord gateway side for standalone Python runs. Docker Compose models these as separate `bot-api` and `bot-discord` services.

### Interface

The interface requires PostgreSQL to browse existing data. The bot, Redis, and workers are only required for background jobs and Discord-driven actions.

1. Navigate to the interface folder with `cd /interface`
2. Install the dependencies with `npm install`
3. Create a `.env` file with required variables:
   ```env
   BOT_API_URL=http://127.0.0.1:8000
   # ... other environment variables from .env.global
   ```
4. Run the interface with `npm run dev`

**Note:** When running in Docker, `BOT_API_URL` is automatically set to `http://bot-api:8000` in `docker-compose.yml`.
