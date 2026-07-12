# Hosted setup

This guide covers how to set up and use a hosted Discord Clip Saver instance. It is the fastest way to save, search, and organize server clips without operating databases, storage, or bot processes yourself.

## Prerequisites

- A Discord account.
- To add the bot to a server, you must have the **Manage Server** or **Administrator** permission in that Discord server.

## Steps

### 1. Sign In

Click the **Sign In** button at the top right of the screen. You'll be redirected to Discord to securely log in and grant us permission to see which servers you're in.

### 2. Invite the Bot

Once signed in, open the server list, find the server to enable, and select **Setup**. You will be prompted to invite the Discord Clip Saver bot.

_The bot must be able to view the selected channels and read their message history. Restricted channels may need a channel-level permission override._

### 3. Complete the Setup Flow

After the bot joins, the setup flow discovers the server channels, enables scanning for the guild and its channels, and automatically queues an initial scan for channels that have not been scanned before. You can disable channels later from **Channels & Scans** in the dashboard.

### 4. Wait for Scans to Complete

Workers index historical messages in batches and generate thumbnails in the background. Monitor progress from **Channels & Scans** in the dashboard. Use **Catch Up** for newer gaps and **Import Full History** when you need to extend the scanned range backward.

### 5. Enjoy your Clips!

Once scanning finishes, head over to the **Clips** tab to browse, search, and watch your saved media.

## Next steps

- Read the [Using the Dashboard](/docs/features/dashboard) guide to learn how to control scans and permissions.
- Read the [Viewing Clips](/docs/features/clips) guide to learn how to organize your media.
