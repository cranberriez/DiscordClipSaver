# Using the Dashboard

Once you've set up Guild Moments and invited the bot, the Dashboard is your central hub for managing how clips are collected and categorized.

## Channels Management

The **Channels** tab allows you to toggle which channels the bot monitors.
- **Enable Scanning**: The bot will listen for new video attachments in this channel.
- **Disable Scanning**: The bot will ignore this channel completely.

## Scans Panel

The **Scans** tab is where you control historical message scanning. There are two levels of scanning: Global (all enabled channels) and Individual (specific channels).

### Global Scans (All Channels)
These scans run across every channel you currently have enabled.
- **Quick Catch-up**: Scans recent history to pick up any clips missed while the bot was offline. Use this if you know a clip was posted but the bot missed it due to a restart or outage.
- **Deep Historical Scan**: A heavy operation that scans backwards through the entire history of all enabled channels. You can choose to skip existing clips or force an update.

### Individual Channel Scans
These options appear next to specific channels and perform the exact same operations as their Global counterparts, but restricted to that single channel.
- **Initial Historical Scan**: Typically run once when you first enable a channel to pull down its backlog of older clips.

### The Golden Rule of Scanning
**You rarely need to run manual scans.** 

Guild Moments is designed to be fully autonomous once setup:
1. **Real-time Listening**: If a channel is enabled, any new video attached to a message is saved instantly. You do not need to scan to get new clips.
2. **Automatic Gap Filling**: If the bot goes offline, it automatically detects the gap when it reconnects and catches up on the messages it missed.
3. **One and Done**: Once you have performed a Deep Historical scan on a channel and it has parsed through its entire message history, you *never* need to scan it again. 

*Note: In the future, the UI will add a visual indicator to let you know when a channel's history has been fully backfilled to the very beginning, confirming that no further historical scans are necessary.*

## Tags

The **Tags** tab lets you define custom labels for your server (e.g., `#funny`, `#fail`, `#highlight`). 
- Any user with access to the dashboard can apply these tags to clips.
- Tags make it much easier to filter and search for specific moments later.

## Danger Zone & Purging

If you need to clean up data, the **Settings** tab contains the Danger Zone.
- **Purge Channel**: Deletes all clips and thumbnails for a specific channel (subject to a cooldown).
- **Purge All Channels**: Wipes all clip data but keeps the bot in the server.
- **Purge Guild**: Completely deletes all data associated with your server and instructs the bot to leave.

