# Discord Clip Saver documentation

Discord Clip Saver indexes video attachments posted in Discord, creates persistent thumbnails, and gives members a searchable web library. Original videos remain on Discord and are played from refreshed Discord CDN URLs. The application can run as a complete Docker stack on your own server or as individual services during development.

## Choose your setup path

You have a few ways to get started depending on your technical expertise and needs.

### 1. Using our Hosted Version (Recommended)

If you just want to use the bot without worrying about servers, databases, or uptime, use our official hosted version. This is the fastest way to get started.

- [Hosted Setup Guide](/docs/getting-started/hosted)

### 2. Self-hosting

If you prefer to maintain full control over your data and infrastructure, you can host Discord Clip Saver yourself. This requires setting up a Discord application and having a server/VPS to run the Docker containers.

- [Self-hosted Setup Guide](/docs/getting-started/self-hosted)

### 3. Local Development

If you're a developer looking to contribute to the project, or you just want to test it out on your local machine before deploying, follow the local development guide.

- [Local Development Guide](/docs/getting-started/local-dev)

## What you'll find in the docs

We've organized the documentation to help you get up and running quickly:

- **Getting Started**: Setup paths and the collection lifecycle.
- **Setup Guides**: Discord credentials, environment configuration, FFmpeg, and optional Google Cloud Storage.
- **Features & Usage**: Channel scanning, clip permissions, command palette filtering, tags, privacy, settings, and cleanup.
