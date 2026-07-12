# FFmpeg setup

Workers use FFmpeg and FFprobe to inspect video attachments and generate thumbnails. Docker worker images already include FFmpeg. Install it only when running a worker directly on your host.

## Install on your operating system

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# macOS with Homebrew
brew install ffmpeg

# Windows with winget
winget install "FFmpeg (Essentials Build)"
```

Confirm both commands resolve in the terminal that will run the worker:

```bash
ffmpeg -version
ffprobe -version
```

Install FFmpeg system-wide or otherwise ensure both executables are available on the `PATH` inherited by the worker process. Download binaries only from a source you trust, and restart the worker after changing the installation.

If clips are indexed but thumbnails fail, inspect worker logs first. A missing executable, a binary not visible to the running process, or an unsupported or corrupt media file are the usual causes.
