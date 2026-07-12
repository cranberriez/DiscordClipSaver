# Google Cloud Storage

Local Docker storage is the default and is appropriate for a single-host installation. Google Cloud Storage (GCS) is an optional thumbnail backend for persistent or externally managed object storage. Workers write private objects; the interface authorizes access and produces short-lived signed read URLs.

## Prepare Google Cloud

1. Create or select a Google Cloud project and enable the **Cloud Storage API**.
2. Create a bucket in a region near the application. Use uniform bucket-level access and enforce public access prevention.
3. Create a dedicated service account and grant it **Storage Object Admin** on that bucket. Do not grant broad project Owner or Editor roles.
4. Create a JSON key for that account and save it outside the repository with restrictive permissions.

## Configure Compose

Set runtime values in `.env.global`:

```dotenv
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=your-private-bucket
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/var/run/secrets/google/service-account.json
GCS_SIGNED_URL_TTL_SECONDS=3900
THUMBNAIL_BROWSER_CACHE_SECONDS=3600
```

Set the host path of the JSON key in root `.env`:

```dotenv
GCS_CREDENTIALS_FILE=/absolute/path/to/service-account.json
```

Start the desired stack with the GCS overlay so the credential is mounted into worker and interface:

```bash
# Local Docker
docker compose -f docker-compose.yml -f docker-compose.gcs.yml up -d --build

# Production
docker compose -f docker-compose-prod.yml -f docker-compose.gcs.yml up -d
```

## Existing local thumbnails

Switching `STORAGE_TYPE` does not automatically copy existing thumbnails. Plan and test a migration before cutover. The repository’s detailed [GCS operations guide](https://github.com/cranberriez/DiscordClipSaver/blob/master/docs/GCS_THUMBNAIL_STORAGE.md) covers migration scripts, dry runs, verification, caching, and rollback considerations.

Keep the bucket private. Signed URLs are temporary bearer credentials, so do not log or share them. If the interface reports credential or signing failures, confirm the GCS overlay is active, the host JSON path exists, and `GOOGLE_APPLICATION_CREDENTIALS` is the in-container path above.
