# Discord Clip Saver - Worker

The worker service processes jobs from a Redis stream to scan Discord channels for video clips.

## Architecture

The worker consists of several components:

- **main.py**: Entry point that orchestrates initialization and job processing
- **processor.py**: Job processor that handles different job types (batch, message, rescan, thumbnail_retry)
- **database.py**: Database connection wrapper (deprecated - use shared.db.utils instead)
- **discord/**: Discord API utilities
  - `bot.py`: Discord bot instance for fetching messages
  - `get_message.py`: Fetch specific messages
  - `get_message_history.py`: Fetch message history with pagination
- **redis/**: Redis stream client and job schemas
  - `redis.py`: Pydantic models for job types
  - `redis_client.py`: Redis stream client for reading/writing jobs
- **message/**: Message processing
  - `message_handler.py`: Process Discord messages and extract clips
  - `extract_details.py`: Extract details from Discord messages

## Setup

1. **Install FFmpeg** (required for thumbnail generation):
   
   You can either install FFmpeg **locally in the project** (recommended) or **system-wide**.
   
   ### Option A: Local Installation (Recommended)
   
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
   
   ### Option B: System-Wide Installation
   
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
   
   ### Verify Installation
   
   **Local installation:**
   ```bash
   # Windows
   .\bin\ffmpeg\bin\ffmpeg.exe -version
   
   # macOS/Linux
   ./bin/ffmpeg/bin/ffmpeg -version
   ```
   
   **System installation:**
   ```bash
   ffmpeg -version
   ```
   
   The worker will automatically detect FFmpeg in `bin/ffmpeg/` first, then fall back to system PATH.

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables** (create `.env` file):
   ```env
   # Discord Bot
   DISCORD_BOT_TOKEN=your_bot_token_here
   
   # Database
   DATABASE_URL=postgres://user:password@localhost:5432/discord_clips
   # OR use individual components:
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=discord_clips
   
   # Redis
   REDIS_URL=redis://localhost:6379
   ```

3. **Ensure database is initialized**:
   The worker uses the shared database configuration. Make sure the database schema is created.

## Running the Worker

Start the worker:
```bash
python main.py
```

The worker will:
1. Connect to the database
2. Start the Discord bot
3. Connect to Redis
4. Begin processing jobs from the Redis stream

## Testing

Use the test job pusher to send test jobs to the worker:

```bash
python test_job_pusher.py
```

This will prompt you to select a job type and push it to Redis. The worker will pick it up and process it.

**Note**: You'll need to update the test script with real Discord guild IDs, channel IDs, and message IDs for testing.

## Job Types

### Batch Scan Job
Scans N messages from a channel (backward or forward).

```python
{
    "type": "batch",
    "job_id": "uuid",
    "guild_id": "123456789",
    "channel_id": "987654321",
    "settings": {
        "allowed_mime_types": ["video/mp4", "video/webm"],
        "match_regex": null,
        "scan_mode": "backward",
        "enable_message_content_storage": true
    },
    "direction": "backward",
    "limit": 100,
    "before_message_id": null,
    "after_message_id": null
}
```

### Message Scan Job
Processes specific message IDs (for real-time processing).

```python
{
    "type": "message",
    "job_id": "uuid",
    "guild_id": "123456789",
    "channel_id": "987654321",
    "settings": {...},
    "message_ids": ["111222333", "444555666"]
}
```

### Rescan Job
Triggered by settings changes or manual rescan requests.

```python
{
    "type": "rescan",
    "job_id": "uuid",
    "guild_id": "123456789",
    "channel_id": "987654321",
    "settings": {...},
    "reason": "settings_changed",
    "reset_scan_status": false
}
```

### Thumbnail Retry Job
Retries failed thumbnail generation.

```python
{
    "type": "thumbnail_retry",
    "job_id": "uuid",
    "guild_id": "123456789",
    "channel_id": "987654321",
    "settings": {...},
    "clip_ids": ["clip1", "clip2"],
    "retry_count": 0
}
```

## Redis Stream

The worker uses Redis Streams for job queuing with consumer groups:

- **Stream name**: `discord_clip_jobs`
- **Consumer group**: `worker_group`
- **Consumer name**: `worker_1` (can be made unique per instance)

Jobs are acknowledged after successful processing. Failed jobs are also acknowledged to prevent infinite retries (implement dead letter queue for production).

## Graceful Shutdown

The worker handles SIGTERM and SIGINT signals for graceful shutdown:
- Stops accepting new jobs
- Closes Discord bot connection
- Closes Redis connection
- Closes database connections

Press `Ctrl+C` to trigger graceful shutdown.

## Development Notes

- The `database.py` file is deprecated. Use `shared.db.utils.init_db()` and `shared.db.utils.close_db()` instead.
- Thumbnail generation is not yet implemented (placeholder in processor)
- The worker currently acknowledges failed jobs. Consider implementing retry logic or dead letter queue for production.
- Consumer name can be made unique per worker instance for horizontal scaling.
