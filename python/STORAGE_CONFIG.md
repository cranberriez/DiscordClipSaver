# Storage Configuration

The application supports multiple storage backends that can be switched via environment variables.

## Local Development

```bash
# .env
STORAGE_TYPE=local
STORAGE_PATH=./storage
```

Files will be saved to `./storage/` directory.

## Docker with Volume

```yaml
# docker-compose.yml
services:
  worker:
    environment:
      - STORAGE_TYPE=local
      - STORAGE_PATH=/app/storage
    volumes:
      - thumbnail-storage:/app/storage

volumes:
  thumbnail-storage:
    driver: local
```

Files persist in a Docker volume that survives container restarts.

## Google Cloud Storage (GCS)

```bash
# .env
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=my-discord-clips-bucket
GCS_PROJECT_ID=my-gcp-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Files are uploaded to GCS bucket.

### GCS Setup:
1. Create a GCS bucket
2. Create a service account with Storage Object Admin role
3. Download service account JSON key
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON path

## AWS S3 (Future)

```bash
# .env
STORAGE_TYPE=s3
S3_BUCKET_NAME=my-discord-clips-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## Switching Between Backends

Just change the `STORAGE_TYPE` environment variable:
- `local` - Local filesystem (dev or Docker volume)
- `gcs` - Google Cloud Storage
- `s3` - AWS S3 (when implemented)

**No code changes required!** The factory pattern handles everything.

## Storage Paths

All backends use the same path structure:
```
thumbnails/
  guild_{guild_id}/
    clip_{clip_id}.webp
```

Example: `thumbnails/guild_928427413694734396/clip_abc123def456.webp`

## Public URLs

- **Local**: `/storage/thumbnails/guild_123/clip_abc.webp` (served by API)
- **GCS**: `https://storage.googleapis.com/bucket-name/thumbnails/guild_123/clip_abc.webp`
- **S3**: `https://bucket-name.s3.amazonaws.com/thumbnails/guild_123/clip_abc.webp`

## Migration Between Backends

To migrate from local to cloud:
1. Upload existing files from `./storage/` to cloud bucket
2. Update `STORAGE_TYPE` environment variable
3. Restart services

The database stores relative paths, so URLs are generated on-the-fly based on the current backend.
