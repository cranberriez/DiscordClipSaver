# Using the Dashboard

Once you have invited Discord Clip Saver, the [Dashboard](/dashboard) is the central place for managing collection, scans, tags, and server settings. Choose a server there to open its management pages.

## Channels & Scans

The **Channels & Scans** tab combines channel controls with scan status and actions.

- **Enable scanning** allows new and historical messages in that channel to be processed.
- **Disable scanning** stops that channel from being archived. The bot may still receive Discord events, but workers will not process clips from the disabled channel.
- **Catch Up** scans forward from the channel's last scanned message. **Catch Up All** does the same for every enabled channel.
- **Scan Unscanned** starts the first scan for enabled channels that have no scan history.
- **Import Full History** scans backward from the oldest scanned message to bring in older history.
- **Deep Integrity Scan** rechecks all messages for gaps while skipping clips already processed.
- **Rescan Failed** retries channels whose most recent scan failed.
- **Force Reprocess** clears scan state and processes everything again. It is slow and should be reserved for cases where parsing or metadata must be regenerated.

The table shows each channel's scan status, newest and oldest scanned messages, and clip count. Large scans run asynchronously through Redis and may take time to finish.

## Normal collection lifecycle

You rarely need advanced scan actions after setup:

1. New messages in enabled channels are batched briefly and queued automatically.
2. When the bot reconnects after an outage, it detects history gaps and queues catch-up work.
3. Use **Import Full History** once for each channel whose older history you want.
4. Use **Catch Up** when you need to fill recent activity manually. Integrity and force-reprocess actions are maintenance tools.

## Tags

The **Tags** tab lets the claimed installation owner create, rename, recolor, and delete server-specific labels such as `#funny`, `#fail`, or `#highlight`. A clip's author, the claimed owner, or a system administrator can apply existing tags to that clip. Read [Using tags](/docs/features/tags) for filtering and administration details.

## Settings and purging

The **Settings** tab contains guild defaults, personal defaults, and destructive cleanup controls.

- **Purge Channel** deletes archived records and thumbnails for one channel, subject to the configured cooldown.
- **Purge All Channels** removes clip data from every channel but keeps the bot in the server.
- **Purge Guild** removes the server's stored data and instructs the bot to leave.

Purge operations are asynchronous and destructive. Confirm backups and the selected scope before starting one.
