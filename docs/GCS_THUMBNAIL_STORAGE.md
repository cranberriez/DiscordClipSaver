# Google Cloud Storage Thumbnail Operations Guide

This guide is the authoritative setup and operations reference for thumbnail
storage. It covers direct local development, local Docker (including Windows
Docker Desktop), production Docker, migration, deployment scripts, caching,
verification, and troubleshooting.

## What the system does

- `STORAGE_TYPE=local` keeps thumbnails on the filesystem at `STORAGE_PATH`.
- `STORAGE_TYPE=gcs` makes workers write private objects to Google Cloud
  Storage and makes the interface issue short-lived V4 signed read URLs.
- New object keys have this exact shape:

    ```text
    thumbnails/v1/{guildId}/{channelId}/{clipId}/{small|large}.webp
    ```

- Clients request opaque application URLs:

    ```text
    /api/thumbnails/{clipId}/{small|large}
    ```

- The application never lists bucket prefixes or exposes a folder-browsing
  endpoint. The old `/api/storage/...` endpoint always returns 404.
- Before signing, the interface verifies authentication, current guild and
  channel access, the exact thumbnail row, clip visibility, and archive state.
- Active public clips are available to current channel members. Active
  unlisted/private clips require the clip author or guild owner. Archived clips
  require the guild owner. Deleted messages/channels and missing objects return 404.
- A signed URL is a bearer credential until it expires. Keep the configured TTL
  short and do not log or share signed URLs.

The migration is never automatic. It does not list folders, overwrite existing
objects, or delete local data.

## Google Cloud Console setup

### 1. Select or create a project

Open the [Google Cloud Console](https://console.cloud.google.com/) and click the
project selector at the top.

- For an existing project, copy the value in the **Project ID** column. Do not
  use the display name or numeric project number.
- For a new project, click **New Project**, enter a name, and record the
  generated permanent Project ID.
- Confirm that billing is attached to the project.

### 2. Enable APIs

Go to **APIs & Services > Library** and enable:

- **Cloud Storage API**
- **IAM Service Account Credentials API** (useful for a future keyless signing
  setup; JSON private keys can sign locally)

### 3. Create a private bucket

Go to **Cloud Storage > Buckets > Create** and select:

- A globally unique bucket name.
- A region near the application server.
- **Standard** storage class.
- **Public access prevention: Enforced**.
- **Access control: Uniform**.
- Hierarchical namespace and object versioning disabled unless there is a
  separate operational reason to enable them.

Review the bucket soft-delete policy. Keeping soft delete provides recovery but
can retain deleted-object storage charges.

### 4. Create a service account

Go to **IAM & Admin > Service Accounts > Create Service Account**.

Suggested values:

```text
Name: Discord Clip Thumbnails
ID: discord-clip-thumbnails
```

Do not grant a project-wide Owner, Editor, or Storage Admin role. Finish creating
the account, then grant access at the bucket:

1. Open **Cloud Storage > Buckets > your bucket > Permissions**.
2. Click **Grant Access**.
3. Add the service-account email as the principal.
4. Select **Cloud Storage > Storage Object Admin**.

The current deployment uses the same identity for workers, migration, and URL
signing. Object Admin is needed for create, exact-object reads, metadata updates,
and deletes, but it does not grant bucket administration.

### 5. Create the JSON credential

Open the service account, select **Keys**, then **Add Key > Create new key >
JSON**. Move the downloaded file outside the repository and protect it. Google
does not provide the private key for download again; create a replacement and
revoke the old key if it is lost or exposed.

If key creation is disabled by organization policy, do not weaken the policy.
Use a keyless attached-service-account or Workload Identity design instead;
`docker-compose.gcs.yml` is specifically the JSON-key bind-mount setup.

Official references:

- [Create buckets](https://cloud.google.com/storage/docs/creating-buckets)
- [Public access prevention](https://cloud.google.com/storage/docs/public-access-prevention)
- [Uniform bucket-level access](https://cloud.google.com/storage/docs/uniform-bucket-level-access)
- [Create service accounts](https://cloud.google.com/iam/docs/service-accounts-create)
- [Create and delete service-account keys](https://cloud.google.com/iam/docs/keys-create-delete)
- [V4 signed URLs](https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers)

## Configuration reference

| Variable                          | Where                               | Purpose                                                                                                |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `STORAGE_TYPE`                    | Runtime environment / `.env.global` | `local` or `gcs`; this is the actual backend cutover.                                                  |
| `STORAGE_PATH`                    | Runtime environment / `.env.global` | Local storage root; `/app/storage` in Docker.                                                          |
| `GCS_BUCKET_NAME`                 | Runtime environment / `.env.global` | Exact GCS bucket name. Required for GCS.                                                               |
| `GCS_PROJECT_ID`                  | Runtime environment / `.env.global` | Google Cloud Project ID. Optional when ADC supplies it, but recommended.                               |
| `GOOGLE_APPLICATION_CREDENTIALS`  | Runtime environment / `.env.global` | Credential path seen **inside** the process/container.                                                 |
| `GCS_CREDENTIALS_FILE`            | Root `.env` for Compose             | Credential path on the **Docker host**. Used only for bind-mount interpolation.                        |
| `GCS_SIGNED_URL_TTL_SECONDS`      | Runtime environment / `.env.global` | Signed URL lifetime; integer from 30 through 7200. Default 3900 (65 minutes).                          |
| `THUMBNAIL_BROWSER_CACHE_SECONDS` | Runtime environment / `.env.global` | Private browser cache lifetime. Must be at least 30 seconds shorter than signed URL TTL. Default 3600. |
| `GCS_LOCAL_FALLBACK_PATH`         | Runtime environment / `.env.global` | Optional read-only local fallback during transition. It never copies or deletes files.                 |

`GCS_CREDENTIALS_FILE` and `GOOGLE_APPLICATION_CREDENTIALS` identify the same
credential at different sides of a Docker mount:

```text
Host:      GCS_CREDENTIALS_FILE=C:/Users/name/.gcp/dcs-gcs.json
Container: GOOGLE_APPLICATION_CREDENTIALS=/var/run/secrets/google/service-account.json
```

Do not put JSON contents in an env file and never commit the JSON key.

Recommended GCS runtime values:

```dotenv
STORAGE_TYPE="gcs"
STORAGE_PATH="/app/storage"
GCS_BUCKET_NAME="your-exact-bucket-name"
GCS_PROJECT_ID="your-project-id"
GOOGLE_APPLICATION_CREDENTIALS="/var/run/secrets/google/service-account.json"
GCS_SIGNED_URL_TTL_SECONDS=3900
THUMBNAIL_BROWSER_CACHE_SECONDS=3600
GCS_LOCAL_FALLBACK_PATH="/app/storage"
```

## Setup A: direct local development (no Docker application containers)

### Local filesystem backend

No Google configuration is required:

```dotenv
STORAGE_TYPE="local"
STORAGE_PATH="E:/Dev/Projects/DiscordClipSaver/storage"
```

Use one absolute storage path shared by the worker and interface. Put that same
value in the worker process environment and `interface/.env`; relative paths
would resolve from different working directories and point at different files.
On Linux, an equivalent value might be
`/home/yourname/DiscordClipSaver/storage`.

Install dependencies from the repository:

```powershell
cd python
pip install -r worker/requirements.txt

cd ../interface
npm install
```

Run PostgreSQL and Redis separately as required by the normal development
workflow. Start the Python worker from `python/` and the interface from
`interface/`.

### Direct local processes using GCS

The credential path must be the real host path because there is no container
mount. On Windows PowerShell:

```powershell
$env:STORAGE_TYPE = "gcs"
$env:GCS_BUCKET_NAME = "your-exact-bucket-name"
$env:GCS_PROJECT_ID = "your-project-id"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\yourname\.gcp\discordclipsaver-gcs.json"
$env:GCS_SIGNED_URL_TTL_SECONDS = "3900"
$env:THUMBNAIL_BROWSER_CACHE_SECONDS = "3600"
```

Set the same GCS runtime values in `interface/.env` for Next.js. Do not set
`GCS_CREDENTIALS_FILE`; that variable is only for Compose bind mounts.

When transitioning direct local files, also set
`GCS_LOCAL_FALLBACK_PATH` in `interface/.env` to the same absolute local storage
root until migration is verified.

For a direct local migration, export the database and GCS variables in the
shell, change to `python/`, and point `--source-root` at the existing local
storage directory:

```powershell
cd python
python -m worker.migrate_thumbnails_to_gcs --source-root ../storage --dry-run
python -m worker.migrate_thumbnails_to_gcs --source-root ../storage --apply
```

Replace `../storage` with the actual directory used by the previous local
configuration.

The direct migration loads a nearby `.env`, but does not automatically load the
repository's `.env.global`. Shell-export the required variables or provide them
through the direct-service environment.

## Setup B: local Docker / Windows Docker Desktop using GCS

Use Git Bash for the provided `.sh` scripts.

### 1. Store the credential

Recommended Windows location:

```text
C:\Users\yourname\.gcp\discordclipsaver-gcs.json
```

Docker Desktop must be allowed to bind-mount that user directory.

### 2. Configure root `.env`

Use forward slashes for the Windows host path:

```dotenv
GCS_CREDENTIALS_FILE=C:/Users/yourname/.gcp/discordclipsaver-gcs.json
```

### 3. Configure root `.env.global`

Use the recommended GCS runtime block above. In particular:

```dotenv
STORAGE_TYPE="gcs"
GOOGLE_APPLICATION_CREDENTIALS="/var/run/secrets/google/service-account.json"
```

`--local` means “build with `docker-compose.yml`”; it does not mean local
filesystem storage. `STORAGE_TYPE=gcs` still selects GCS.

### 4. First startup

```bash
bash scripts/first-deploy.sh --local
```

If `.env` or `.env.global` is missing, the script creates it from the example,
stops, and asks for configuration. Edit the files and run the command again.

Later startups without rebuilding:

```bash
bash scripts/start.sh --local
```

Force the GCS overlay for a diagnostic command:

```bash
bash scripts/compose.sh --local --gcs config
```

Stop or remove the local stack:

```bash
bash scripts/compose.sh --local stop
bash scripts/compose.sh --local down
```

### 5. Verify both credential mounts

```bash
bash scripts/compose.sh --local --gcs exec worker \
  sh -lc 'ls -l "$GOOGLE_APPLICATION_CREDENTIALS" && test -r "$GOOGLE_APPLICATION_CREDENTIALS"'

bash scripts/compose.sh --local --gcs exec interface \
  sh -lc 'ls -l "$GOOGLE_APPLICATION_CREDENTIALS" && test -r "$GOOGLE_APPLICATION_CREDENTIALS"'
```

The expected in-container path is:

```text
/var/run/secrets/google/service-account.json
```

### 6. Migrate Docker-volume thumbnails

Docker thumbnails are in the named `worker_storage` volume, mounted at
`/app/storage`. They do not need to be copied onto the Windows host.

```bash
bash scripts/migrate-thumbnails.sh --local --dry-run
bash scripts/migrate-thumbnails.sh --local --apply
```

The migration script always forces the GCS overlay and verifies the credential
before starting Python.

## Setup C: production Docker using GCS

### 1. Store and protect the key

Recommended host path:

```text
/opt/discordclipsaver/secrets/gcs-service-account.json
```

Example permissions:

```bash
sudo chown root:root /opt/discordclipsaver/secrets/gcs-service-account.json
sudo chmod 600 /opt/discordclipsaver/secrets/gcs-service-account.json
```

Set the host path in root `.env`:

```dotenv
GCS_CREDENTIALS_FILE=/opt/discordclipsaver/secrets/gcs-service-account.json
```

Set the GCS runtime block in root `.env.global`.

### 2. First deployment

```bash
bash scripts/first-deploy.sh --production
```

On a completely fresh checkout, the first run creates missing `.env` files and
stops. Configure them, install the credential, and run the command again. The
successful run validates Compose, pulls application images, starts the stack,
and installs an executable ignored `deploy.sh` from `deploy.example.sh` when it
does not already exist.

Production uses prebuilt GHCR images. Pulling Git source alone does not update
the code inside containers; CI must publish the new images and deployment must
pull them.

### 3. Ongoing operations

Deploy updated images and configuration:

```bash
./deploy.sh
```

If an older ignored `deploy.sh` predates the GCS-aware wrapper, refresh it once:

```bash
cp deploy.example.sh deploy.sh
chmod +x deploy.sh
```

Start existing containers without pulling:

```bash
bash scripts/start.sh --production
```

Stop or remove the production stack:

```bash
bash scripts/compose.sh --production stop
bash scripts/compose.sh --production down
```

The wrapper reads `STORAGE_TYPE` and adds `docker-compose.gcs.yml` automatically
for every command. `--gcs` can force the overlay during diagnostics.

### 4. Safe production migration sequence

1. Back up the database and retain the `worker_storage` volume.
2. Set `STORAGE_TYPE=gcs` and keep
   `GCS_LOCAL_FALLBACK_PATH=/app/storage`.
3. Deploy the GCS-capable worker and interface.
4. Confirm credentials are readable in both containers.
5. Run dry-run and inspect every counter:

    ```bash
    bash scripts/migrate-thumbnails.sh --production --dry-run
    ```

6. Apply explicitly:

    ```bash
    bash scripts/migrate-thumbnails.sh --production --apply
    ```

7. Spot-check authorized thumbnails through the application and verify objects
   in the intended bucket/project.
8. Rerun `--apply` safely if interrupted. Existing objects are treated as
   restart success and database rows are only changed after the object exists.
9. After an observation period, remove `GCS_LOCAL_FALLBACK_PATH` and recreate
   worker/interface. Retain the old volume until backups and rollback policy say
   it is safe to remove. No script deletes it automatically.

To process a smaller batch:

```bash
bash scripts/migrate-thumbnails.sh --production --dry-run --limit 100
bash scripts/migrate-thumbnails.sh --production --apply --batch-size 200
```

`--limit` must be positive. `--batch-size` defaults to 200 and must be from 1
through 5000.

### 5. Verify production credentials and delivery

```bash
bash scripts/compose.sh --production --gcs exec worker \
  sh -lc 'test -r "$GOOGLE_APPLICATION_CREDENTIALS" && echo worker-ok'

bash scripts/compose.sh --production --gcs exec interface \
  sh -lc 'test -r "$GOOGLE_APPLICATION_CREDENTIALS" && echo interface-ok'
```

Inspect interface delivery logs:

```bash
bash scripts/compose.sh --production logs --tail=100 interface
```

The application `/health` endpoint currently verifies `STORAGE_PATH`; it is not
a complete GCS bucket, credential, or signed-URL health check. Use the checks
above and an authorized thumbnail request.

## Script reference

| Script                          | Local     | Production      | Behavior                                                                                                                                   |
| ------------------------------- | --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/compose.sh`            | `--local` | `--production`  | Selects the base Compose file, adds GCS overlay when configured, and forwards all remaining Compose arguments. `--gcs` forces the overlay. |
| `scripts/first-deploy.sh`       | `--local` | `--production`  | Bootstraps missing env files; then builds locally or pulls production images and starts the stack.                                         |
| `scripts/start.sh`              | `--local` | `--production`  | Runs `up -d` without pulling or rebuilding.                                                                                                |
| `scripts/migrate-thumbnails.sh` | `--local` | `--production`  | Forces GCS overlay. Dry-run by default; `--apply` is required to change data.                                                              |
| `deploy.sh`                     | Not used  | Production only | Pulls the configured Git branch and GHCR app images, then reconciles the production stack through the wrapper.                             |

Examples:

```bash
# Show the merged configuration without changing containers
bash scripts/compose.sh --local config
bash scripts/compose.sh --production config

# Recreate only interface with a guaranteed GCS mount
bash scripts/compose.sh --production --gcs up -d --force-recreate interface

# Follow logs
bash scripts/compose.sh --local logs -f worker interface
bash scripts/compose.sh --production logs -f worker interface
```

## Migration summary reference

The final line identifies the destination bucket/project and includes:

| Counter             | Meaning                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `examined`          | Active thumbnail database rows inspected. Archived clips are included. |
| `would_upload`      | Dry-run objects that would be uploaded.                                |
| `would_update_rows` | Dry-run database paths that would be changed.                          |
| `uploaded`          | Objects created during apply.                                          |
| `already_present`   | Exact destination objects already present; safe on restart.            |
| `rows_updated`      | Database paths changed after destination existence was established.    |
| `metadata_updated`  | Existing objects updated to the private browser-cache policy.          |
| `missing_source`    | Database row exists but its current local source file does not.        |
| `failed`            | Per-row exceptions.                                                    |

Dry-run is the default even if neither `--dry-run` nor `--apply` is supplied.
Dry-run never changes GCS or the database. The command exits nonzero when
`missing_source` or `failed` is nonzero.

## Browser and server caching

- The interface does not cache image bytes on disk or in memory. It authorizes
  and signs; GCS serves the bytes.
- The opaque authorization response and GCS object use:

    ```text
    Cache-Control: private, max-age=3600, no-transform
    ```

- `private` permits browser caching but not shared proxy/GCS public caching.
- The default one-hour cache is backed by a 65-minute signed URL, leaving a
  five-minute expiration margin.
- Cache lifetime must remain at least 30 seconds shorter than signed URL TTL.
- Set `THUMBNAIL_BROWSER_CACHE_SECONDS=0` to disable browser caching.
- After changing cache settings, deploy the updated worker/interface and rerun
  migration with `--apply`; existing objects receive updated metadata without
  being re-uploaded.

## Troubleshooting

### `Local source root does not exist: /app/C:/Program Files/Git/app/storage`

Cause: Git Bash/MSYS converted the container path `/app/storage` into a Windows
host path before Docker received it.

Solution: use `scripts/migrate-thumbnails.sh`. The Compose wrapper disables MSYS
path conversion. Do not manually pass Linux container paths through an older
unwrapped Git Bash Docker command.

### Local thumbnails “do not exist” because they are inside Docker

Docker thumbnails live in the named `worker_storage` volume. Compose `run`
attaches the worker service's volumes automatically.

Verify:

```bash
bash scripts/compose.sh --local run --rm worker \
  sh -lc 'find /app/storage -type f | head -20'
```

Use `--production` on the server.

### `DefaultCredentialsError` or credential file not found

If the missing path is `/var/run/secrets/google/service-account.json`, the GCS
overlay was absent, the host path is wrong, or the service was not recreated.

Check:

- `GCS_CREDENTIALS_FILE` is in root `.env`, not `.env.global`.
- The host JSON file exists and Docker Desktop/Linux Docker can read it.
- `GOOGLE_APPLICATION_CREDENTIALS` is the container path in `.env.global`.
- Run through `compose.sh` or pass both Compose files.

Recreate the affected service:

```bash
bash scripts/compose.sh --local --gcs up -d --force-recreate interface
bash scripts/compose.sh --production --gcs up -d --force-recreate interface
```

Use only the command for the relevant environment.

### Browser reports CORS or same-origin policy and the interface logs 503

First inspect the interface log. If it says the service-account JSON is absent,
this is a signing failure, not bucket CORS. Recreate interface with the GCS
overlay and verify its credential mount. Normal `<img>` delivery through a
signed URL does not require a permissive bucket CORS policy.

Only investigate bucket CORS if a separate browser feature uses JavaScript
`fetch`, canvas pixel reads, or another API that actually requires cross-origin
response access.

### Migration says it worked but the bucket is empty

Common causes:

1. It was a dry run. Look for `DRY RUN ONLY` and use `--apply`.
2. `would_upload` was zero or `examined` was zero.
3. The printed `bucket=` or `project=` differs from the Console selection.
4. Local images were not rebuilt, or production CI had not published/pulled the
   worker image containing the current migration.
5. `missing_source` or `failed` was nonzero.

Use:

```bash
bash scripts/migrate-thumbnails.sh --local --apply
bash scripts/migrate-thumbnails.sh --production --apply
```

Use only the relevant environment. The migration supports local files already
stored under the new v1 path and uploads them when the GCS object is missing.

### Production Git is updated but container behavior is old

Production Compose uses prebuilt GHCR images. A Git pull changes Compose and
scripts on the host, not application code inside an existing image. Wait for CI
to publish images, then run:

```bash
./deploy.sh
```

If `deploy.sh` predates this guide, refresh it from `deploy.example.sh` first.

### Interface lacks credentials but migration succeeded

The migration starts a new worker container with the forced GCS overlay. An
older already-running interface might still lack the mount. Recreate interface
with `--gcs --force-recreate` and verify the file from inside the container.

### `403 Forbidden` from Google Cloud

Check that:

- The JSON belongs to the expected service account/project.
- That service account has **Storage Object Admin** on the exact bucket.
- Public access prevention remains enabled; signed URLs do not require a public
  bucket.
- The credential contains a service-account private key. User ADC without a
  signing key can require `iam.serviceAccounts.signBlob` and is not equivalent
  to the documented JSON-key Compose setup.

### `404 Thumbnail not found`

Possible causes include a missing exact object, a soft-deleted thumbnail row,
deleted message/channel, lost current channel access, or visibility/archive
authorization. The application deliberately returns 404 for denied protected
objects to avoid leaking their existence.

Check the migration counters, exact bucket/project, interface logs, and whether
the requesting Discord user can currently access that channel and clip.

### Cache setting validation failure

`GCS_SIGNED_URL_TTL_SECONDS` must be 30–7200. Browser cache must be nonnegative
and at least 30 seconds shorter. Recommended values:

```dotenv
GCS_SIGNED_URL_TTL_SECONDS=3900
THUMBNAIL_BROWSER_CACHE_SECONDS=3600
```

### Compose fails because the credential file does not exist

This is intentional when the GCS overlay is selected. The bind uses
`create_host_path: false` so Docker cannot silently create a directory where a
JSON file was expected. Correct `GCS_CREDENTIALS_FILE` or switch
`STORAGE_TYPE=local` and do not force `--gcs`.

### First deploy stops after creating env files

This is intentional. It prevents a stack from starting with placeholder
secrets. Configure `.env` and `.env.global`, then run first deploy again.

## Verification tests

From `python/` with Python dependencies installed:

```bash
python -m unittest shared.storage.tests.test_storage
```

From `interface/`:

```bash
npm test
npm run lint
npm run build
```
