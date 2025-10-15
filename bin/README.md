# Local Binary Dependencies

This directory contains local installations of binary dependencies that are not committed to the repository.

## FFmpeg

FFmpeg is required for video thumbnail generation in the worker service.

### Local Installation

**Windows:**
1. Download `ffmpeg-release-essentials.zip` from https://www.gyan.dev/ffmpeg/builds/
2. Extract the zip file (you'll get a folder like `ffmpeg-8.0-essentials_build`)
3. Rename/move that folder to `bin/ffmpeg/`
4. Verify you have `bin/ffmpeg/bin/ffmpeg.exe`

**macOS/Linux:**
See `python/worker/README.md` for platform-specific download commands.

**Expected structure:**
```
bin/
└── ffmpeg/
    ├── bin/
    │   ├── ffmpeg.exe (Windows)
    │   ├── ffmpeg (macOS/Linux)
    │   └── ffprobe.exe
    ├── doc/
    └── presets/
```

### Why Local Installation?

- **No system pollution**: Keeps your system PATH clean
- **Portable**: Other developers can use the same setup
- **Version control**: Everyone uses the same FFmpeg version
- **No admin rights needed**: Install without system-wide permissions

### Note

The `bin/ffmpeg/` directory is gitignored and will not be committed to the repository.
Each developer needs to install FFmpeg locally following the setup instructions.
