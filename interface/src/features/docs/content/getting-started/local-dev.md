# Local Development

This guide is for developers who want to contribute to the project or test modifications locally.

## Prerequisites

- **Node.js** (v20+ recommended)
- **Python** (v3.13+ recommended)
- **Docker** (Required for spinning up Postgres and Redis)
- **FFmpeg** (Required for local thumbnail generation)

## Project Structure

The repository is structured into two main parts:
- `/interface`: The Next.js web application.
- `/python`: The Discord bot and background worker.

## Running Locally

### 1. Start Dependencies
First, start the database and caching layers using Docker.
```bash
docker compose up dcs-postgres dcs-redis -d
```

### 2. Configure Environment
Copy `.env.global.example` to `.env.global` and fill out the required Discord developer credentials. Ensure both the `interface` and `python` components can read this file. You will need a test bot token and OAuth credentials from the Discord Developer Portal.

### 3. Run the Next.js Interface
```bash
cd interface
npm install
npm run dev
```
The interface will be available at `http://localhost:3000`.

### 4. Run the Bot and Worker
In a new terminal, set up your Python virtual environment:
```bash
cd python
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

Start the bot:
```bash
python -m bot.main
```

Start the background worker (in yet another terminal):
```bash
python -m worker.main
```

## Contribution Guidelines

- **Keep changes small and focused**: Open pull requests for specific features or bug fixes.
- **Follow the architecture**: We use Kysely for database queries and Zustand for frontend state.
- **Test your changes**: Ensure your changes don't break the bot's ability to scan or the web UI's ability to play clips.
