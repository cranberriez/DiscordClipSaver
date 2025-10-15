# Thumbnail Generator

Generates WebP thumbnails from video clips for efficient preview display.

## Features

### Dual Thumbnail Sizes

The generator creates two thumbnail sizes for each clip:
- **Small**: 320x180 (default) - For grid/list views
- **Large**: 640x360 (default) - For preview/hover states

Both sizes are configurable via environment variables.

### Full Video Download

Videos are downloaded in full to ensure compatibility with all MP4 encoding formats. MP4 metadata (moov atom) can be at the beginning or end of the file, so full downloads guarantee successful processing.

### Configuration

Configure thumbnail sizes and quality via environment variables:

```bash
# Thumbnail dimensions
THUMBNAIL_SMALL_WIDTH=320      # Default: 320px
THUMBNAIL_SMALL_HEIGHT=180     # Default: 180px
THUMBNAIL_LARGE_WIDTH=640      # Default: 640px
THUMBNAIL_LARGE_HEIGHT=360     # Default: 360px

# Frame extraction
THUMBNAIL_TIMESTAMP=1.0        # Default: 1.0 seconds into video

# WebP quality
THUMBNAIL_QUALITY=85           # Default: 85 (0-100)
```

**Usage:**
```python
# Generate both thumbnails with defaults
small_path, large_path = await generator.generate_for_clip(clip)

# Custom timestamp (e.g., 2 seconds in)
small_path, large_path = await generator.generate_for_clip(clip, timestamp=2.0)
```

## Technical Details

**Process:**
1. Download full video from Discord CDN
2. Extract frame at specified timestamp using FFmpeg
3. Generate small thumbnail (320x180) and convert to WebP
4. Generate large thumbnail (640x360) and convert to WebP
5. Upload both thumbnails to storage backend
6. Clean up temporary files (video and frame)

**File Naming:**
- Small: `{clip_id}_small.webp`
- Large: `{clip_id}_large.webp`
- Stored in: `thumbnails/guild_{guild_id}/`

Using clip ID (hash) as filename prevents collisions and ensures uniqueness.

**Dependencies:**
- FFmpeg binary (for frame extraction)
- ffmpeg-python (Python wrapper)
- Pillow (image processing)
- aiohttp (HTTP client with range support)

## Testing

See `test_thumbnail.py` for a standalone test script that doesn't require database setup.
