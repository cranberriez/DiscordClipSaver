# Self-hosted Setup

This guide is for users who want to run Guild Moments on their own infrastructure. Self-hosting gives you complete control over your data, storage, and bot customization.

## Prerequisites

Before you begin, ensure you have the following:

- **A Server / VPS**: A Linux machine (e.g., Ubuntu) with Docker and Docker Compose installed.
- **A Discord Bot Application**: You need to create a bot in the [Discord Developer Portal](https://discord.com/developers/applications) and get its Bot Token.
- **Domain Name (Optional)**: To host the web interface securely via HTTPS using Traefik.
- **Basic Docker Knowledge**: Familiarity with `docker-compose` and environment variables.

## What you'll deploy

Our provided `docker-compose-prod.yml` will spin up the following containers:

- **Next.js Interface**: The web dashboard you're reading this on.
- **Python Bot**: The Discord bot that listens to messages in real-time.
- **Python Worker**: Background task processor for downloading clips and generating thumbnails.
- **PostgreSQL**: The main database for storing clips, messages, and settings.
- **Redis**: Used for task queuing (RQ) and caching.
- **Dozzle**: Used for Docker log aggregation and viewing.
- **Uptime Kuma**: Used for service uptime monitoring.

## Quick Start

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a New Application.
3. Navigate to the **Bot** tab, enable the **Message Content Intent** (Required to read messages with clips) and **Server Members Intent** (Required to fetch member information and channel access).
4. Copy the **Bot Token** and save it for later.
5. Under the **OAuth2 > General** tab, copy the **Client ID** and **Client Secret** and save them for later.
6. Set up your OAuth2 Redirect URI to point to `https://<your-domain>/api/auth/callback/discord` also add `https://<your-domain>/api/discord/bot/claim`.
7. In the **Installation** tab, select the Guild Install method only and set Install Link to None, this is recommended to avoid the bot joining servers without assigning ownership to the person who invited it.

### 2. Clone the Repository

SSH into your server and clone the Guild Moments repository:

```bash
git clone https://github.com/cranberriez/DiscordClipSaver.git
cd DiscordClipSaver
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
cp .env.global.example .env.global
```

Edit `.env` using your preferred text editor (like `nano` or `vim`) and fill in the required variables:

- `DISCORD_TOKEN`: Your Bot Token.
- `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -hex 32`).
- `DISCORD_CLIENT_ID` & `DISCORD_CLIENT_SECRET`: From your Discord app.
- `PUBLIC_DOMAIN`: Your website domain for Traefik routing.
- `ACME_EMAIL`: Your email for Let's Encrypt SSL certificates.
- Database credentials, storage paths, and an `INTERNAL_HEALTH_TOKEN`.

### 4. Start the Containers

Once configured, use Docker Compose to build and start the stack:

```bash
docker compose -f docker-compose-prod.yml up -d --build
```

### 5. Setup your Server

Once the interface is running, the steps to invite the bot and start scanning are exactly the same as the hosted version.

**[Follow the Hosted Setup steps to configure your server](/docs/getting-started/hosted)**

## Common Issues

### I don't have a domain name
Traefik (the reverse proxy) requires a domain name to route traffic and generate SSL certificates. If you only have an IP address (e.g. `1.2.3.4`), you can use a free wildcard DNS service like `sslip.io`.

In your `.env` file, set:
```env
PUBLIC_DOMAIN=1.2.3.4.sslip.io
NEXTAUTH_URL=https://1.2.3.4.sslip.io
```
Traefik will treat this as a real domain and automatically provision a certificate for it.

