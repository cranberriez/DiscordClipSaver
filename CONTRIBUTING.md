# Contributing to Discord Clip Saver

Thank you for your interest in contributing! This guide will help you set up your development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Python 3.12+** (but <3.14.0 due to asyncpg compatibility)
- **Node.js 20+** and npm
- **Docker** and Docker Compose (for local database/redis)
- **FFmpeg** (for thumbnail generation)

### FFmpeg Installation

FFmpeg is required for video thumbnail generation. You can install it **locally in the project** (recommended) or system-wide.

#### Option A: Local Installation (Recommended)

Install FFmpeg in the project's `bin/ffmpeg/` directory. This keeps your system clean and makes the project portable.

**Windows:**
```powershell
# Manual installation (from project root: DiscordClipSaver/)
# 1. Download ffmpeg-release-essentials.zip from https://www.gyan.dev/ffmpeg/builds/
# 2. Extract the zip file
# 3. Move/rename the extracted folder to: bin/ffmpeg/
# 4. Verify you have: bin/ffmpeg/bin/ffmpeg.exe
```

**macOS:**
```bash
# From project root
mkdir -p bin/ffmpeg/bin

# Download static build
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o /tmp/ffmpeg.zip
unzip /tmp/ffmpeg.zip -d bin/ffmpeg/bin/
chmod +x bin/ffmpeg/bin/ffmpeg
```

**Linux:**
```bash
# From project root
mkdir -p bin/ffmpeg/bin

# Download static build
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -O /tmp/ffmpeg.tar.xz
tar -xf /tmp/ffmpeg.tar.xz -C /tmp/
cp /tmp/ffmpeg-*-amd64-static/ffmpeg bin/ffmpeg/bin/
chmod +x bin/ffmpeg/bin/ffmpeg
```

**Verify local installation:**
```powershell
# Windows
.\bin\ffmpeg\bin\ffmpeg.exe -version

# macOS/Linux
./bin/ffmpeg/bin/ffmpeg -version
```

#### Option B: System-Wide Installation

**Windows:**
```powershell
# Using winget (recommended)
winget install "FFmpeg (Essentials Build)"

# OR using Chocolatey
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

**Verify system installation:**
```bash
ffmpeg -version
```

The worker will automatically detect FFmpeg in `bin/ffmpeg/` first, then fall back to system PATH.

## Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/DiscordClipSaver.git
cd DiscordClipSaver
```

### 2. Set Up Environment Variables

Copy the example environment file:
```bash
cp .env.global.example .env.global
```

Fill in the required values:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `DISCORD_CLIENT_SECRET` - Your Discord application client secret
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- Database and Redis URLs (if not using Docker)

### 3. Start Infrastructure Services

Start PostgreSQL and Redis using Docker:
```bash
docker compose up -d dcs-postgres dcs-redis
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 4. Set Up Python Worker

```bash
# Navigate to python directory
cd python

# (Optional) Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install worker dependencies
cd worker
pip install -r requirements.txt
```

### 5. Set Up Python Bot

```bash
# From python directory
cd bot
pip install -r requirements.txt
```

### 6. Set Up Next.js Interface

```bash
cd interface
npm install
```

## Running the Application

### Option 1: Run Everything with Docker
```bash
docker compose up -d
```

Access the interface at http://localhost:3000

### Option 2: Run Services Locally (for development)

**Terminal 1 - Bot:**
```bash
cd python
python -m bot.main
```

**Terminal 2 - Worker:**
```bash
cd python
python -m worker.main
```

**Terminal 3 - Interface:**
```bash
cd interface
npm run dev
```

Access the interface at http://localhost:3000

## Project Structure

```
DiscordClipSaver/
├── python/
│   ├── bot/          # Discord bot API server
│   ├── worker/       # Background job processor
│   └── shared/       # Shared database, Redis, storage utilities
├── interface/        # Next.js web interface
├── docs/             # Documentation
└── docker-compose.yml
```

## Common Development Tasks

### Running Database Migrations
```bash
# Migrations are handled automatically by Tortoise ORM on startup
# Schema changes in python/shared/db/models.py will be applied
```

### Testing Job Processing
```bash
cd python/worker
python test_job_pusher.py
```

### Viewing Logs
```bash
# Docker logs
docker compose logs -f dcs-worker
docker compose logs -f dcs-bot

# Local logs appear in terminal
```

## Troubleshooting

### FFmpeg Not Found
If you see "FFmpeg not found in system PATH":
1. Verify installation: `ffmpeg -version`
2. Ensure ffmpeg is in your system PATH
3. Restart your terminal/IDE after installation

### Database Connection Issues
- Ensure PostgreSQL is running: `docker compose ps`
- Check connection string in `.env.global`
- Verify port 5432 is not in use by another service

### Redis Connection Issues
- Ensure Redis is running: `docker compose ps`
- Check connection string in `.env.global`
- Verify port 6379 is not in use by another service

### Import Errors in Python
- Ensure you're running from the `python/` directory
- Use module syntax: `python -m bot.main` not `python bot/main.py`
- Check that `PYTHONPATH` includes the project root

## Code Style

- Python: Follow PEP 8
- TypeScript/React: Prettier configuration in `.prettierrc.json`
- Run formatters before committing

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages
5. Push and create a pull request

## Questions?

Open an issue on GitHub or reach out to the maintainers.
