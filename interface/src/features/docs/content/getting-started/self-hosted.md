# Self-hosted setup

This deployment runs Discord Clip Saver on infrastructure you control. The production Compose stack uses PostgreSQL for metadata, Redis for background work, Docker volumes for persistent data, and Traefik for HTTPS.

## Before you begin

- A Linux server/VPS with Docker Engine, the Docker Compose plugin, and Git.
- A public DNS name pointing to the server. Ports 80 and 443 must be reachable for HTTPS certificates. An `sslip.io` hostname can work for a temporary IP-based setup.
- A Discord application with a bot token and OAuth client credentials. Follow the [Discord application guide](/docs/setup/discord-application).
- Access to back up Docker volumes or PostgreSQL.

## Deploy

### 1. Clone and configure

```bash
git clone https://github.com/cranberriez/DiscordClipSaver.git
cd DiscordClipSaver
cp .env.example .env
cp .env.global.example .env.global
```

Edit `.env` with your bot token, Discord OAuth client ID and secret, database password, `PUBLIC_DOMAIN`, `ACME_EMAIL`, and independently generated `NEXTAUTH_SECRET`, `INTERNAL_API_TOKEN`, and `INTERNAL_HEALTH_TOKEN`. The examples label each value. Keep this file private and out of source control.

Set `STORAGE_TYPE=local` in `.env.global` to keep thumbnails in the Docker volume, or follow the [Google Cloud Storage guide](/docs/setup/google-cloud-storage) before starting with GCS.

### 2. Start the production stack

Production Compose pulls published images; it does not build application images on the server.

```bash
docker compose -f docker-compose-prod.yml pull
docker compose -f docker-compose-prod.yml up -d
docker compose -f docker-compose-prod.yml ps
```

The one-shot `db-schema` service creates missing database tables before application services start. Inspect startup with:

```bash
docker compose -f docker-compose-prod.yml logs -f
```

### 3. Connect your Discord server

Open `https://<your-domain>`, sign in through Discord, and use the setup flow to invite the bot and choose channels. For enabled channels, the bot receives new messages while workers process historical scans and thumbnail jobs. See the [typical lifecycle](/docs/getting-started/lifecycle) for what happens next.

## Operations

Scale workers when you have a substantial backlog:

```bash
docker compose -f docker-compose-prod.yml up -d --scale worker=3
```

Back up PostgreSQL and the `worker_storage` volume when using local storage. Do not run `docker compose down -v` unless you deliberately intend to remove database, Redis, and thumbnail volumes. See [environment and service patterns](/docs/setup/environment) for the full-stack and split-development alternatives.

## Using an IP address

Traefik needs a routable host name to obtain an HTTPS certificate. If your server IP is `1.2.3.4`, set `PUBLIC_DOMAIN=1.2.3.4.sslip.io`, point Discord’s redirect URLs to that HTTPS origin, and ensure ports 80/443 are open. Production Compose derives `NEXTAUTH_URL` from `PUBLIC_DOMAIN`.
