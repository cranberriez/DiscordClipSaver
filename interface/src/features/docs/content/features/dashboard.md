# Using the Dashboard

Once you've set up Guild Moments and invited the bot, the Dashboard is your central hub for managing how clips are collected and categorized.

## Channels Management

The **Channels** tab allows you to toggle which channels the bot monitors.
- **Enable Scanning**: The bot will listen for new video attachments in this channel.
- **Disable Scanning**: The bot will ignore this channel completely.

## Scans Panel

The **Scans** tab is where you control historical message scanning.
- **Quick Scans**: Catch up on missed clips if the bot was offline.
- **Historical Scans**: Deep-scan a channel from the beginning of time. You can choose to skip existing clips or force an update.

*Note: Scans are processed in the background by our workers. You can leave the page safely while a scan is running.*

## Tags

The **Tags** tab lets you define custom labels for your server (e.g., `#funny`, `#fail`, `#highlight`). 
- Any user with access to the dashboard can apply these tags to clips.
- Tags make it much easier to filter and search for specific moments later.

## Danger Zone & Purging

If you need to clean up data, the **Settings** tab contains the Danger Zone.
- **Purge Channel**: Deletes all clips and thumbnails for a specific channel (subject to a cooldown).
- **Purge All Channels**: Wipes all clip data but keeps the bot in the server.
- **Purge Guild**: Completely deletes all data associated with your server and instructs the bot to leave.
