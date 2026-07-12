# Typical lifecycle

Discord Clip Saver is designed to index clips continuously after initial setup. You configure a server once, backfill the history you care about, and let the bot maintain the searchable library. The application stores metadata and thumbnails; original videos remain on Discord.

## Sign in and install

Sign in to the interface with Discord. A user who can manage a server can start its setup flow, invite the bot, and become responsible for the installation. The bot must be able to view each channel that should be archived.

## Review channels and backfill history

The setup flow initially enables scanning and queues first scans automatically. Review **Channels & Scans** afterward and disable any channels you do not want processed. Use **Catch Up** for recent gaps and **Import Full History** to extend a channel's scanned range backward. Historical work is queued in Redis and processed asynchronously, so a large server can take time without preventing normal use of the site.

## Continuous collection

For enabled channels, the Discord gateway listener receives new messages and queues clip processing. Workers fetch the attachment metadata, create thumbnails with FFmpeg, write thumbnail files to local storage or GCS, and save searchable metadata in PostgreSQL.

## Catch up after an outage

When the bot reconnects, its scan service detects gaps in message history and queues catch-up work. Manual scans are normally only needed for initial backfills, a deliberately changed setting, or an exceptional missed period.

## Browse and curate

Use the Clips view to filter, search, play, favorite, tag, rename, change visibility, archive, or delete clips according to your permissions. Channel and guild settings control which files qualify and how they are processed. A settings change can require a rescan to apply it to existing clips.

## Maintain the installation

Check service health and logs periodically, keep Docker images updated, and back up PostgreSQL plus any local thumbnail volume. If a channel is no longer needed, disable it. Use channel or guild purge controls only when you intentionally want to remove archived records and thumbnails.

## What each service owns

| Service     | Responsibility                                   | Required for                      |
| ----------- | ------------------------------------------------ | --------------------------------- |
| PostgreSQL  | clip metadata, settings, access state            | browsing the interface            |
| Interface   | login, dashboard, search, playback authorization | web use                           |
| Bot Discord | live events and gap detection                    | collecting new messages           |
| Redis       | durable background-job queues                    | scans and asynchronous processing |
| Worker      | scans, clip processing, thumbnails, cleanup      | archives and maintenance          |
| Bot API     | Discord REST actions requested by the interface  | setup and some dashboard actions  |

The interface remains usable for existing data when optional services are down, but scans, new clips, thumbnails, and Discord-backed actions are degraded until they return.
